create or replace function public.user_can_access_cliente_row(
  p_organization_id uuid, p_creator_user_id uuid, p_assigned_user_id uuid
) returns boolean language sql stable security definer set search_path = public as $$
  select case
    when (select auth.uid()) is null then false
    when not exists (
      select 1 from public.organization_members m
      where m.organization_id = p_organization_id and m.user_id = (select auth.uid())
    ) then false
    when exists (
      select 1 from public.organization_members m
      where m.organization_id = p_organization_id and m.user_id = (select auth.uid()) and m.role = 'owner'
    ) then true
    when exists (
      select 1 from public.organization_members m
      where m.organization_id = p_organization_id and m.user_id = (select auth.uid()) and m.data_scope = 'organization'
    ) then true
    else p_creator_user_id = (select auth.uid()) or p_assigned_user_id = (select auth.uid())
  end;
$$;
revoke all on function public.user_can_access_cliente_row(uuid, uuid, uuid) from public;
grant execute on function public.user_can_access_cliente_row(uuid, uuid, uuid) to authenticated;

drop policy if exists "clientes_org_access" on public.clientes;
create policy "clientes_select_org" on public.clientes for select using (
  organization_id in (select public.current_user_organization_ids())
  and public.user_can_access_cliente_row(organization_id, user_id, assigned_user_id));
create policy "clientes_insert_org" on public.clientes for insert with check (
  organization_id in (select public.current_user_organization_ids())
  and user_id = (select auth.uid()) and assigned_user_id = (select auth.uid()));
create policy "clientes_update_org" on public.clientes for update using (
  organization_id in (select public.current_user_organization_ids())
  and public.user_can_access_cliente_row(organization_id, user_id, assigned_user_id))
  with check (
  organization_id in (select public.current_user_organization_ids())
  and (exists (select 1 from public.organization_members m where m.organization_id = organization_id
        and m.user_id = (select auth.uid()) and m.role = 'owner') or user_id = (select auth.uid())));
create policy "clientes_delete_org" on public.clientes for delete using (
  organization_id in (select public.current_user_organization_ids())
  and (exists (select 1 from public.organization_members m where m.organization_id = organization_id
        and m.user_id = (select auth.uid()) and m.role = 'owner') or user_id = (select auth.uid())));

drop policy if exists "orcamentos_org_access" on public.orcamentos;
create policy "orcamentos_select_org" on public.orcamentos for select using (
  organization_id in (select public.current_user_organization_ids())
  and exists (select 1 from public.clientes c where c.id = orcamentos.cliente_id
    and c.organization_id = orcamentos.organization_id
    and public.user_can_access_cliente_row(c.organization_id, c.user_id, c.assigned_user_id)));
create policy "orcamentos_insert_org" on public.orcamentos for insert with check (
  organization_id in (select public.current_user_organization_ids()) and user_id = (select auth.uid())
  and exists (select 1 from public.clientes c where c.id = orcamentos.cliente_id
    and c.organization_id = orcamentos.organization_id
    and public.user_can_access_cliente_row(c.organization_id, c.user_id, c.assigned_user_id)));
create policy "orcamentos_update_org" on public.orcamentos for update using (
  organization_id in (select public.current_user_organization_ids())
  and exists (select 1 from public.clientes c where c.id = orcamentos.cliente_id
    and c.organization_id = orcamentos.organization_id
    and public.user_can_access_cliente_row(c.organization_id, c.user_id, c.assigned_user_id)))
  with check (organization_id in (select public.current_user_organization_ids())
    and (exists (select 1 from public.organization_members m where m.organization_id = organization_id
      and m.user_id = (select auth.uid()) and m.role = 'owner') or user_id = (select auth.uid())));
create policy "orcamentos_delete_org" on public.orcamentos for delete using (
  organization_id in (select public.current_user_organization_ids())
  and exists (select 1 from public.clientes c where c.id = orcamentos.cliente_id
    and c.organization_id = orcamentos.organization_id
    and public.user_can_access_cliente_row(c.organization_id, c.user_id, c.assigned_user_id))
  and (exists (select 1 from public.organization_members m where m.organization_id = organization_id
    and m.user_id = (select auth.uid()) and m.role = 'owner') or user_id = (select auth.uid())));

drop policy if exists "interacoes_org_access" on public.interacoes;
create policy "interacoes_select_org" on public.interacoes for select using (
  organization_id in (select public.current_user_organization_ids())
  and exists (select 1 from public.clientes c where c.id = interacoes.cliente_id
    and c.organization_id = interacoes.organization_id
    and public.user_can_access_cliente_row(c.organization_id, c.user_id, c.assigned_user_id)));
create policy "interacoes_insert_org" on public.interacoes for insert with check (
  organization_id in (select public.current_user_organization_ids()) and user_id = (select auth.uid())
  and exists (select 1 from public.clientes c where c.id = interacoes.cliente_id
    and c.organization_id = interacoes.organization_id
    and public.user_can_access_cliente_row(c.organization_id, c.user_id, c.assigned_user_id)));
create policy "interacoes_update_org" on public.interacoes for update using (
  organization_id in (select public.current_user_organization_ids())
  and exists (select 1 from public.clientes c where c.id = interacoes.cliente_id
    and c.organization_id = interacoes.organization_id
    and public.user_can_access_cliente_row(c.organization_id, c.user_id, c.assigned_user_id)))
  with check (organization_id in (select public.current_user_organization_ids()) and user_id = (select auth.uid()));
create policy "interacoes_delete_org" on public.interacoes for delete using (
  organization_id in (select public.current_user_organization_ids()) and user_id = (select auth.uid()));

drop policy if exists "assistant_threads_select_org" on public.assistant_chat_threads;
drop policy if exists "assistant_threads_insert_org" on public.assistant_chat_threads;
drop policy if exists "assistant_threads_update_org" on public.assistant_chat_threads;
drop policy if exists "assistant_threads_delete_org" on public.assistant_chat_threads;
create policy "assistant_threads_select_org" on public.assistant_chat_threads for select using (
  organization_id in (select public.current_user_organization_ids())
  and (user_id = (select auth.uid()) or exists (select 1 from public.organization_members m
    where m.organization_id = assistant_chat_threads.organization_id and m.user_id = (select auth.uid())
    and (m.role = 'owner' or m.data_scope = 'organization'))));
create policy "assistant_threads_insert_org" on public.assistant_chat_threads for insert with check (
  organization_id in (select public.current_user_organization_ids()) and user_id = (select auth.uid()));
create policy "assistant_threads_update_org" on public.assistant_chat_threads for update using (
  organization_id in (select public.current_user_organization_ids()) and user_id = (select auth.uid()));
create policy "assistant_threads_delete_org" on public.assistant_chat_threads for delete using (
  organization_id in (select public.current_user_organization_ids()) and user_id = (select auth.uid()));
create or replace function public.list_clientes_com_ultimo_contato(
  p_organization_id uuid, p_ativos_apenas boolean default false
)
returns table (
  id uuid, user_id uuid, organization_id uuid, nome text, tipo text, tax_id text,
  document_enrichment jsonb, ativo boolean, whatsapp text, telefone text,
  produtos_habituais text, observacoes text, cor text, iniciais text,
  created_at timestamptz, updated_at timestamptz, assigned_user_id uuid, ultimo_contato timestamptz
)
language sql stable security invoker set search_path = public as $$
  select c.id, c.user_id, c.organization_id, c.nome, c.tipo, c.tax_id, c.document_enrichment, c.ativo,
    c.whatsapp, c.telefone, c.produtos_habituais, c.observacoes, c.cor, c.iniciais, c.created_at, c.updated_at, c.assigned_user_id,
    (select max(i.data_contato) from public.interacoes i where i.cliente_id = c.id and i.organization_id = c.organization_id)
  from public.clientes c
  where c.organization_id = p_organization_id
    and exists (select 1 from public.organization_members m where m.organization_id = p_organization_id and m.user_id = (select auth.uid()))
    and public.user_can_access_cliente_row(c.organization_id, c.user_id, c.assigned_user_id)
    and (not p_ativos_apenas or c.ativo = true)
  order by c.nome asc;
$$;
