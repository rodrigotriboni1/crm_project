
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

create or replace function public.list_clientes_com_ultimo_contato_page(
  p_organization_id uuid, p_ativos_apenas boolean default false, p_limit int default 150,
  p_cursor_nome text default null, p_cursor_id uuid default null
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
    and ((p_cursor_nome is null and p_cursor_id is null) or (c.nome, c.id) > (p_cursor_nome, p_cursor_id))
  order by c.nome asc, c.id asc
  limit least(greatest(coalesce(p_limit, 150), 1), 500);
$$;

create or replace function public.clientes_kpis_summary(p_organization_id uuid)
returns jsonb language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'ativos', count(*) filter (where c.ativo),
    'arquivados', count(*) filter (where not c.ativo),
    'recompras', count(*) filter (where c.ativo and c.tipo = 'recompra'),
    'com_telefone', count(*) filter (where c.ativo and (
      length(regexp_replace(coalesce(c.whatsapp, ''), '[^0-9]', '', 'g')) >= 8
      or length(regexp_replace(coalesce(c.telefone, ''), '[^0-9]', '', 'g')) >= 8)),
    'sem_contato_30', count(*) filter (where c.ativo and not exists (
      select 1 from public.interacoes i where i.cliente_id = c.id and i.organization_id = c.organization_id
        and i.data_contato >= (now() - interval '30 days'))))
  from public.clientes c
  where c.organization_id = p_organization_id
    and exists (select 1 from public.organization_members m where m.organization_id = p_organization_id and m.user_id = (select auth.uid()))
    and public.user_can_access_cliente_row(c.organization_id, c.user_id, c.assigned_user_id);
$$;
create or replace function public.import_clientes_batch(p_organization_id uuid, p_rows jsonb)
returns jsonb language plpgsql security invoker set search_path = public as $fn$
declare elem jsonb; idx int := 0; n_ok int := 0; errs jsonb := '[]'::jsonb; uid uuid := auth.uid(); v_tipo text;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.organization_members m where m.organization_id = p_organization_id and m.user_id = uid) then
    raise exception 'forbidden';
  end if;
  for elem in select jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    begin
      v_tipo := lower(trim(coalesce(elem->>'tipo', 'novo')));
      if v_tipo not in ('novo', 'recompra') then v_tipo := 'novo'; end if;
      insert into public.clientes (user_id, organization_id, assigned_user_id, nome, tipo, tax_id, document_enrichment, ativo,
        whatsapp, telefone, produtos_habituais, observacoes, cor, iniciais)
      values (uid, p_organization_id, uid, trim(elem->>'nome'), v_tipo, nullif(trim(elem->>'tax_id'), ''),
        case when elem ? 'document_enrichment' and jsonb_typeof(elem->'document_enrichment') = 'object' then elem->'document_enrichment' else null end,
        case when elem ? 'ativo' and (elem->>'ativo') in ('true', 'false') then (elem->>'ativo')::boolean else true end,
        nullif(trim(elem->>'whatsapp'), ''), nullif(trim(elem->>'telefone'), ''), nullif(trim(elem->>'produtos_habituais'), ''),
        nullif(trim(elem->>'observacoes'), ''), nullif(trim(elem->>'cor'), ''), nullif(trim(elem->>'iniciais'), ''));
      n_ok := n_ok + 1;
    exception when unique_violation then
      errs := errs || jsonb_build_array(jsonb_build_object('index', idx, 'msg', 'Documento duplicado (CPF/CNPJ ja existe).'));
    when others then
      errs := errs || jsonb_build_array(jsonb_build_object('index', idx, 'msg', SQLERRM));
    end;
    idx := idx + 1;
  end loop;
  return jsonb_build_object('inserted', n_ok, 'errors', errs);
end;
$fn$;

create or replace function public.list_organization_members(p_organization_id uuid)
returns jsonb language plpgsql security definer set search_path = public, auth as $fn$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.organization_members m where m.organization_id = p_organization_id and m.user_id = v_uid) then
    raise exception 'forbidden';
  end if;
  return coalesce((select jsonb_agg(x.row_data order by x.sort_role, x.sort_email) from (
    select jsonb_build_object('user_id', m.user_id, 'email', u.email::text, 'full_name', p.full_name, 'role', m.role, 'data_scope', m.data_scope) as row_data,
      case when m.role = 'owner' then 0 else 1 end as sort_role, coalesce(u.email::text, '') as sort_email
    from public.organization_members m
    inner join auth.users u on u.id = m.user_id
    left join public.profiles p on p.id = m.user_id
    where m.organization_id = p_organization_id) x), '[]'::jsonb);
end;
$fn$;
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  leader_user_id uuid references auth.users (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists teams_organization_id_idx on public.teams (organization_id);

create table if not exists public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'inactive', 'away')),
  max_open_leads int,
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
create index if not exists team_members_user_id_idx on public.team_members (user_id);

alter table public.teams enable row level security;
alter table public.team_members enable row level security;

create policy "teams_select_member" on public.teams for select
  using (organization_id in (select public.current_user_organization_ids()));
create policy "teams_insert_owner" on public.teams for insert with check (
  organization_id in (select public.current_user_organization_ids())
  and exists (select 1 from public.organization_members m where m.organization_id = organization_id
    and m.user_id = (select auth.uid()) and m.role = 'owner'));
create policy "teams_update_owner" on public.teams for update using (
  organization_id in (select public.current_user_organization_ids())
  and exists (select 1 from public.organization_members m where m.organization_id = teams.organization_id
    and m.user_id = (select auth.uid()) and m.role = 'owner'));
create policy "teams_delete_owner" on public.teams for delete using (
  organization_id in (select public.current_user_organization_ids())
  and exists (select 1 from public.organization_members m where m.organization_id = teams.organization_id
    and m.user_id = (select auth.uid()) and m.role = 'owner'));

create policy "team_members_select" on public.team_members for select using (
  exists (select 1 from public.teams t where t.id = team_members.team_id
    and t.organization_id in (select public.current_user_organization_ids())));
create policy "team_members_insert_owner" on public.team_members for insert with check (
  exists (select 1 from public.teams t where t.id = team_members.team_id
    and t.organization_id in (select public.current_user_organization_ids())
    and exists (select 1 from public.organization_members m where m.organization_id = t.organization_id
      and m.user_id = (select auth.uid()) and m.role = 'owner'))
  and exists (select 1 from public.organization_members m2
    where m2.organization_id = (select t2.organization_id from public.teams t2 where t2.id = team_members.team_id)
      and m2.user_id = team_members.user_id));
create policy "team_members_update_owner" on public.team_members for update using (
  exists (select 1 from public.teams t where t.id = team_members.team_id
    and t.organization_id in (select public.current_user_organization_ids())
    and exists (select 1 from public.organization_members m where m.organization_id = t.organization_id
      and m.user_id = (select auth.uid()) and m.role = 'owner')));
create policy "team_members_delete_owner" on public.team_members for delete using (
  exists (select 1 from public.teams t where t.id = team_members.team_id
    and t.organization_id in (select public.current_user_organization_ids())
    and exists (select 1 from public.organization_members m where m.organization_id = t.organization_id
      and m.user_id = (select auth.uid()) and m.role = 'owner')));

create table if not exists public.organization_audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  actor_user_id uuid not null references auth.users (id) on delete set null,
  action text not null,
  target_user_id uuid references auth.users (id) on delete set null,
  detail jsonb,
  created_at timestamptz not null default now()
);
create index if not exists organization_audit_log_org_idx on public.organization_audit_log (organization_id, created_at desc);
alter table public.organization_audit_log enable row level security;
create policy "organization_audit_select_member" on public.organization_audit_log for select
  using (organization_id in (select public.current_user_organization_ids()));

create or replace function public.log_organization_audit(p_organization_id uuid, p_action text, p_target_user_id uuid, p_detail jsonb)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  insert into public.organization_audit_log (organization_id, actor_user_id, action, target_user_id, detail)
  values (p_organization_id, auth.uid(), p_action, p_target_user_id, p_detail);
end;
$fn$;
revoke all on function public.log_organization_audit(uuid, text, uuid, jsonb) from public;
grant execute on function public.log_organization_audit(uuid, text, uuid, jsonb) to authenticated;

create or replace function public.trg_organization_members_audit() returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if tg_op = 'INSERT' then
    perform public.log_organization_audit(new.organization_id, 'member_added', new.user_id,
      jsonb_build_object('role', new.role, 'data_scope', new.data_scope));
  elsif tg_op = 'UPDATE' then
    perform public.log_organization_audit(new.organization_id, 'member_updated', new.user_id,
      jsonb_build_object('role_before', old.role, 'role_after', new.role, 'data_scope_before', old.data_scope, 'data_scope_after', new.data_scope));
  elsif tg_op = 'DELETE' then
    perform public.log_organization_audit(old.organization_id, 'member_removed', old.user_id, jsonb_build_object('role', old.role));
  end if;
  return coalesce(new, old);
end;
$fn$;
drop trigger if exists organization_members_audit on public.organization_members;
create trigger organization_members_audit after insert or update or delete on public.organization_members
  for each row execute function public.trg_organization_members_audit();
