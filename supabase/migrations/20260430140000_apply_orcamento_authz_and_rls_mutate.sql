-- P0: apply_orcamento_update respects same visibility as RLS (user_can_access_cliente_row).
-- P0: RLS WITH CHECK allows assigned reps and org-scope members to update clientes/orcamentos.

-- ---------------------------------------------------------------------------
-- Helpers: who may change rows (aligned with SELECT visibility + org-wide roles)
-- ---------------------------------------------------------------------------
create or replace function public.user_can_mutate_cliente_row(
  p_organization_id uuid,
  p_creator_user_id uuid,
  p_assigned_user_id uuid
)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select
    exists (
      select 1 from public.organization_members m
      where m.organization_id = p_organization_id
        and m.user_id = (select auth.uid())
        and m.role = 'owner'
    )
    or exists (
      select 1 from public.organization_members m
      where m.organization_id = p_organization_id
        and m.user_id = (select auth.uid())
        and m.data_scope = 'organization'
    )
    or p_creator_user_id = (select auth.uid())
    or p_assigned_user_id = (select auth.uid());
$$;

comment on function public.user_can_mutate_cliente_row(uuid, uuid, uuid) is
  'True if current user may update/delete a cliente row (owner, org data_scope, creator, or assigned).';

revoke all on function public.user_can_mutate_cliente_row(uuid, uuid, uuid) from public;
grant execute on function public.user_can_mutate_cliente_row(uuid, uuid, uuid) to authenticated;

create or replace function public.user_can_mutate_orcamento_row(
  p_organization_id uuid,
  p_orcamento_creator_user_id uuid,
  p_cliente_id uuid
)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select
    exists (
      select 1 from public.organization_members m
      where m.organization_id = p_organization_id
        and m.user_id = (select auth.uid())
        and m.role = 'owner'
    )
    or exists (
      select 1 from public.organization_members m
      where m.organization_id = p_organization_id
        and m.user_id = (select auth.uid())
        and m.data_scope = 'organization'
    )
    or p_orcamento_creator_user_id = (select auth.uid())
    or exists (
      select 1 from public.clientes c
      where c.id = p_cliente_id
        and c.organization_id = p_organization_id
        and c.assigned_user_id = (select auth.uid())
    );
$$;

comment on function public.user_can_mutate_orcamento_row(uuid, uuid, uuid) is
  'True if current user may update/delete an orçamento (owner, org data_scope, quote creator, or cliente assigned rep).';

revoke all on function public.user_can_mutate_orcamento_row(uuid, uuid, uuid) from public;
grant execute on function public.user_can_mutate_orcamento_row(uuid, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- apply_orcamento_update: require cliente visibility (data_scope / carteira)
-- ---------------------------------------------------------------------------
create or replace function public.apply_orcamento_update(
  p_orcamento_id uuid,
  p_status text,
  p_follow_up date,
  p_note text default null,
  p_lost_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old text;
  v_old_fu date;
  v_old_lost text;
  v_user uuid;
  v_org uuid;
  v_cliente uuid;
  v_msg text;
  v_log boolean;
  v_criador uuid;
  v_assigned uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select o.status, o.follow_up_at, o.lost_reason, o.user_id, o.cliente_id, o.organization_id
  into v_old, v_old_fu, v_old_lost, v_user, v_cliente, v_org
  from public.orcamentos o
  where o.id = p_orcamento_id
  for update;

  if not found then
    raise exception 'orçamento não encontrado';
  end if;

  if not exists (
    select 1 from public.organization_members m
    where m.organization_id = v_org and m.user_id = auth.uid()
  ) then
    raise exception 'forbidden';
  end if;

  select c.user_id, c.assigned_user_id
  into v_criador, v_assigned
  from public.clientes c
  where c.id = v_cliente
    and c.organization_id = v_org;

  if not found then
    raise exception 'cliente não encontrado';
  end if;

  if not public.user_can_access_cliente_row(v_org, v_criador, v_assigned) then
    raise exception 'forbidden';
  end if;

  if p_status not in ('novo_contato', 'orcamento_enviado', 'dormindo', 'ganho', 'perdido') then
    raise exception 'status inválido';
  end if;

  if p_status = 'dormindo' and p_follow_up is null then
    raise exception 'Dormindo exige data de follow-up';
  end if;

  declare
    v_new_lost text;
  begin
    v_new_lost := case
      when p_status = 'perdido' then
        coalesce(
          nullif(trim(p_lost_reason), ''),
          nullif(trim(v_old_lost), ''),
          'Não informado'
        )
      else null
    end;

    v_log := (v_old is distinct from p_status)
      or (v_old_fu is distinct from p_follow_up)
      or (v_old_lost is distinct from v_new_lost)
      or (p_note is not null and length(trim(p_note)) > 0);

    update public.orcamentos
    set
      status = p_status,
      follow_up_at = p_follow_up,
      lost_reason = v_new_lost,
      updated_at = now()
    where id = p_orcamento_id;

    if v_log then
      v_msg := '';
      if v_old is distinct from p_status then
        v_msg := format('Status do orçamento: %s → %s', v_old, p_status);
        if p_status = 'perdido' then
          v_msg := v_msg || format('. Motivo: %s', v_new_lost);
        end if;
      end if;
      if v_old_fu is distinct from p_follow_up then
        if length(v_msg) > 0 then v_msg := v_msg || '. '; end if;
        if p_follow_up is null then
          v_msg := v_msg || 'Follow-up removido';
        else
          v_msg := v_msg || 'Follow-up: ' || to_char(p_follow_up, 'YYYY-MM-DD');
        end if;
      end if;
      if v_old_lost is distinct from v_new_lost and p_status = 'perdido' and v_old is not distinct from p_status then
        if length(v_msg) > 0 then v_msg := v_msg || '. '; end if;
        v_msg := v_msg || format('Motivo de perda: %s', v_new_lost);
      end if;
      if p_note is not null and length(trim(p_note)) > 0 then
        if length(v_msg) > 0 then v_msg := v_msg || '. '; end if;
        v_msg := v_msg || trim(p_note);
      end if;
      if length(trim(v_msg)) = 0 then
        v_msg := 'Orçamento atualizado';
      end if;

      insert into public.interacoes (user_id, cliente_id, orcamento_id, canal, anotacao, data_contato, organization_id)
      values (
        auth.uid(),
        v_cliente,
        p_orcamento_id,
        'Sistema',
        v_msg,
        now(),
        v_org
      );
    end if;
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS: clientes / orcamentos UPDATE + DELETE WITH CHECK / USING
-- ---------------------------------------------------------------------------
drop policy if exists "clientes_update_org" on public.clientes;
create policy "clientes_update_org" on public.clientes for update using (
  organization_id in (select public.current_user_organization_ids())
  and public.user_can_access_cliente_row(organization_id, user_id, assigned_user_id))
  with check (
    organization_id in (select public.current_user_organization_ids())
    and public.user_can_mutate_cliente_row(organization_id, user_id, assigned_user_id));

drop policy if exists "clientes_delete_org" on public.clientes;
create policy "clientes_delete_org" on public.clientes for delete using (
  organization_id in (select public.current_user_organization_ids())
  and public.user_can_access_cliente_row(organization_id, user_id, assigned_user_id)
  and public.user_can_mutate_cliente_row(organization_id, user_id, assigned_user_id));

drop policy if exists "orcamentos_update_org" on public.orcamentos;
create policy "orcamentos_update_org" on public.orcamentos for update using (
  organization_id in (select public.current_user_organization_ids())
  and exists (select 1 from public.clientes c where c.id = orcamentos.cliente_id
    and c.organization_id = orcamentos.organization_id
    and public.user_can_access_cliente_row(c.organization_id, c.user_id, c.assigned_user_id)))
  with check (
    organization_id in (select public.current_user_organization_ids())
    and public.user_can_mutate_orcamento_row(organization_id, user_id, cliente_id));

drop policy if exists "orcamentos_delete_org" on public.orcamentos;
create policy "orcamentos_delete_org" on public.orcamentos for delete using (
  organization_id in (select public.current_user_organization_ids())
  and exists (select 1 from public.clientes c where c.id = orcamentos.cliente_id
    and c.organization_id = orcamentos.organization_id
    and public.user_can_access_cliente_row(c.organization_id, c.user_id, c.assigned_user_id))
  and public.user_can_mutate_orcamento_row(organization_id, user_id, cliente_id));
