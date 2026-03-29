-- Multi-tenant: organizations + organization_members, organization_id nas tabelas de negócio, RLS por membro, RPCs com p_organization_id

-- ---------------------------------------------------------------------------
-- 1) Tabelas de organização
-- ---------------------------------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.organizations is 'Tenant B2B: dados de clientes/orçamentos partilhados por organização.';

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index if not exists organization_members_user_id_idx on public.organization_members (user_id);

comment on table public.organization_members is 'Utilizadores com acesso a uma organização (owner | member).';

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

-- ---------------------------------------------------------------------------
-- 2) Uma organização por perfil existente (backfill antes de NOT NULL)
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
  oid uuid;
begin
  for r in select id as uid from public.profiles
  loop
    insert into public.organizations (name) values ('Organização') returning id into oid;
    insert into public.organization_members (organization_id, user_id, role) values (oid, r.uid, 'owner');
  end loop;
end $$;

-- Utilizadores com dados mas sem perfil (raro): criar org + membro
do $$
declare
  r record;
  oid uuid;
begin
  for r in
    select distinct x.user_id as uid
    from (
      select user_id from public.clientes
      union select user_id from public.orcamentos
      union select user_id from public.interacoes
      union select user_id from public.produtos
      union select user_id from public.assistant_chat_threads
    ) x
    where not exists (select 1 from public.organization_members m where m.user_id = x.user_id)
  loop
    insert into public.organizations (name) values ('Organização') returning id into oid;
    insert into public.organization_members (organization_id, user_id, role) values (oid, r.uid, 'owner');
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3) Colunas organization_id (nullable → backfill → NOT NULL)
-- ---------------------------------------------------------------------------
alter table public.clientes add column if not exists organization_id uuid references public.organizations (id);
alter table public.orcamentos add column if not exists organization_id uuid references public.organizations (id);
alter table public.interacoes add column if not exists organization_id uuid references public.organizations (id);
alter table public.produtos add column if not exists organization_id uuid references public.organizations (id);
alter table public.assistant_chat_threads add column if not exists organization_id uuid references public.organizations (id);

update public.clientes c
set organization_id = m.organization_id
from public.organization_members m
where m.user_id = c.user_id and c.organization_id is null;

update public.orcamentos o
set organization_id = c.organization_id
from public.clientes c
where o.cliente_id = c.id and o.organization_id is null;

update public.orcamentos o
set organization_id = m.organization_id
from public.organization_members m
where m.user_id = o.user_id and o.organization_id is null;

update public.interacoes i
set organization_id = c.organization_id
from public.clientes c
where i.cliente_id = c.id and i.organization_id is null;

update public.interacoes i
set organization_id = m.organization_id
from public.organization_members m
where m.user_id = i.user_id and i.organization_id is null;

update public.produtos p
set organization_id = m.organization_id
from public.organization_members m
where m.user_id = p.user_id and p.organization_id is null;

update public.assistant_chat_threads t
set organization_id = m.organization_id
from public.organization_members m
where m.user_id = t.user_id and t.organization_id is null;

do $$
begin
  if exists (select 1 from public.clientes where organization_id is null) then
    raise exception 'backfill failed: clientes.organization_id null';
  end if;
  if exists (select 1 from public.orcamentos where organization_id is null) then
    raise exception 'backfill failed: orcamentos.organization_id null';
  end if;
  if exists (select 1 from public.interacoes where organization_id is null) then
    raise exception 'backfill failed: interacoes.organization_id null';
  end if;
  if exists (select 1 from public.produtos where organization_id is null) then
    raise exception 'backfill failed: produtos.organization_id null';
  end if;
  if exists (select 1 from public.assistant_chat_threads where organization_id is null) then
    raise exception 'backfill failed: assistant_chat_threads.organization_id null';
  end if;
end $$;

alter table public.clientes alter column organization_id set not null;
alter table public.orcamentos alter column organization_id set not null;
alter table public.interacoes alter column organization_id set not null;
alter table public.produtos alter column organization_id set not null;
alter table public.assistant_chat_threads alter column organization_id set not null;

create index if not exists clientes_organization_id_idx on public.clientes (organization_id);
create index if not exists orcamentos_organization_id_idx on public.orcamentos (organization_id);
create index if not exists interacoes_organization_id_idx on public.interacoes (organization_id);
create index if not exists produtos_organization_id_idx on public.produtos (organization_id);
create index if not exists assistant_chat_threads_org_updated_idx on public.assistant_chat_threads (organization_id, updated_at desc);

-- ---------------------------------------------------------------------------
-- 4) openrouter_chat_rate: uma linha por organização
-- ---------------------------------------------------------------------------
alter table public.openrouter_chat_rate add column if not exists organization_id uuid references public.organizations (id);

update public.openrouter_chat_rate o
set organization_id = m.organization_id
from public.organization_members m
where m.user_id = o.user_id and o.organization_id is null;

delete from public.openrouter_chat_rate where organization_id is null;

delete from public.openrouter_chat_rate a
using public.openrouter_chat_rate b
where a.organization_id is not distinct from b.organization_id
  and a.organization_id is not null
  and a.user_id::text > b.user_id::text;

alter table public.openrouter_chat_rate drop constraint if exists openrouter_chat_rate_pkey;
alter table public.openrouter_chat_rate drop constraint if exists openrouter_chat_rate_user_id_fkey;

alter table public.openrouter_chat_rate alter column organization_id set not null;

alter table public.openrouter_chat_rate drop column if exists user_id;

alter table public.openrouter_chat_rate add primary key (organization_id);

-- ---------------------------------------------------------------------------
-- 5) Unicidades e índices de orçamentos / clientes por organização
-- ---------------------------------------------------------------------------
drop index if exists public.clientes_user_id_tax_id_unique;
create unique index if not exists clientes_organization_tax_id_unique
  on public.clientes (organization_id, tax_id)
  where tax_id is not null and btrim(tax_id) <> '';

drop index if exists public.orcamentos_user_display_num_uidx;
create unique index if not exists orcamentos_organization_display_num_uidx
  on public.orcamentos (organization_id, display_num);

drop index if exists public.orcamentos_user_status_idx;
drop index if exists public.orcamentos_user_data_orcamento_idx;
drop index if exists public.orcamentos_user_updated_at_idx;
drop index if exists public.orcamentos_user_created_id_idx;

create index if not exists orcamentos_org_status_idx on public.orcamentos (organization_id, status);
create index if not exists orcamentos_org_data_orcamento_idx on public.orcamentos (organization_id, data_orcamento);
create index if not exists orcamentos_org_updated_at_idx on public.orcamentos (organization_id, updated_at desc);
create index if not exists orcamentos_org_created_id_idx on public.orcamentos (organization_id, created_at desc, id desc);

create or replace function public.orcamentos_set_display_num()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.display_num is null then
    select coalesce(max(display_num), 0) + 1 into new.display_num
    from public.orcamentos
    where organization_id = new.organization_id;
  end if;
  return new;
end;
$$;

drop index if exists public.interacoes_user_cliente_data_idx;
create index if not exists interacoes_org_cliente_data_idx on public.interacoes (organization_id, cliente_id, data_contato desc);

-- ---------------------------------------------------------------------------
-- 6) RLS organizations + organization_members
-- ---------------------------------------------------------------------------
create policy "organizations_select_member"
  on public.organizations for select
  using (
    id in (
      select m.organization_id from public.organization_members m
      where m.user_id = (select auth.uid())
    )
  );

create policy "organizations_update_member"
  on public.organizations for update
  using (
    id in (
      select m.organization_id from public.organization_members m
      where m.user_id = (select auth.uid())
    )
  );

create policy "organization_members_select"
  on public.organization_members for select
  using (
    organization_id in (
      select m.organization_id from public.organization_members m
      where m.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 7) RLS tabelas de negócio (substitui filtro só por user_id)
-- ---------------------------------------------------------------------------
drop policy if exists "clientes_all_own" on public.clientes;
create policy "clientes_org_access"
  on public.clientes for all
  using (
    organization_id in (
      select m.organization_id from public.organization_members m
      where m.user_id = (select auth.uid())
    )
  )
  with check (
    organization_id in (
      select m.organization_id from public.organization_members m
      where m.user_id = (select auth.uid())
    )
    and user_id = (select auth.uid())
  );

drop policy if exists "orcamentos_all_own" on public.orcamentos;
create policy "orcamentos_org_access"
  on public.orcamentos for all
  using (
    organization_id in (
      select m.organization_id from public.organization_members m
      where m.user_id = (select auth.uid())
    )
  )
  with check (
    organization_id in (
      select m.organization_id from public.organization_members m
      where m.user_id = (select auth.uid())
    )
    and user_id = (select auth.uid())
  );

drop policy if exists "interacoes_all_own" on public.interacoes;
create policy "interacoes_org_access"
  on public.interacoes for all
  using (
    organization_id in (
      select m.organization_id from public.organization_members m
      where m.user_id = (select auth.uid())
    )
  )
  with check (
    organization_id in (
      select m.organization_id from public.organization_members m
      where m.user_id = (select auth.uid())
    )
    and user_id = (select auth.uid())
  );

drop policy if exists "produtos_all_own" on public.produtos;
create policy "produtos_org_access"
  on public.produtos for all
  using (
    organization_id in (
      select m.organization_id from public.organization_members m
      where m.user_id = (select auth.uid())
    )
  )
  with check (
    organization_id in (
      select m.organization_id from public.organization_members m
      where m.user_id = (select auth.uid())
    )
    and user_id = (select auth.uid())
  );

drop policy if exists "assistant_threads_select_own" on public.assistant_chat_threads;
drop policy if exists "assistant_threads_insert_own" on public.assistant_chat_threads;
drop policy if exists "assistant_threads_update_own" on public.assistant_chat_threads;
drop policy if exists "assistant_threads_delete_own" on public.assistant_chat_threads;

create policy "assistant_threads_select_org"
  on public.assistant_chat_threads for select
  using (
    organization_id in (
      select m.organization_id from public.organization_members m
      where m.user_id = (select auth.uid())
    )
  );

create policy "assistant_threads_insert_org"
  on public.assistant_chat_threads for insert
  with check (
    organization_id in (
      select m.organization_id from public.organization_members m
      where m.user_id = (select auth.uid())
    )
    and user_id = (select auth.uid())
  );

create policy "assistant_threads_update_org"
  on public.assistant_chat_threads for update
  using (
    organization_id in (
      select m.organization_id from public.organization_members m
      where m.user_id = (select auth.uid())
    )
  );

create policy "assistant_threads_delete_org"
  on public.assistant_chat_threads for delete
  using (
    organization_id in (
      select m.organization_id from public.organization_members m
      where m.user_id = (select auth.uid())
    )
  );

drop policy if exists "assistant_chat_messages_select" on public.assistant_chat_messages;
drop policy if exists "assistant_chat_messages_insert" on public.assistant_chat_messages;
drop policy if exists "assistant_chat_messages_delete" on public.assistant_chat_messages;

create policy "assistant_chat_messages_select"
  on public.assistant_chat_messages for select
  using (
    exists (
      select 1 from public.assistant_chat_threads t
      where t.id = thread_id
        and t.organization_id in (
          select m.organization_id from public.organization_members m
          where m.user_id = (select auth.uid())
        )
    )
  );

create policy "assistant_chat_messages_insert"
  on public.assistant_chat_messages for insert
  with check (
    exists (
      select 1 from public.assistant_chat_threads t
      where t.id = thread_id
        and t.organization_id in (
          select m.organization_id from public.organization_members m
          where m.user_id = (select auth.uid())
        )
    )
  );

create policy "assistant_chat_messages_delete"
  on public.assistant_chat_messages for delete
  using (
    exists (
      select 1 from public.assistant_chat_threads t
      where t.id = thread_id
        and t.organization_id in (
          select m.organization_id from public.organization_members m
          where m.user_id = (select auth.uid())
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 8) RPC: membership helper + create_organization + signup
-- ---------------------------------------------------------------------------
create or replace function public.create_organization(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  insert into public.organizations (name)
  values (coalesce(nullif(trim(p_name), ''), 'Organização'))
  returning id into v_org;
  insert into public.organization_members (organization_id, user_id, role)
  values (v_org, v_uid, 'owner');
  return v_org;
end;
$$;

grant execute on function public.create_organization(text) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;

  if not exists (select 1 from public.organization_members where user_id = new.id) then
    insert into public.organizations (name)
    values (coalesce(nullif(trim(new.email), ''), 'Organização'))
    returning id into v_org;

    insert into public.organization_members (organization_id, user_id, role)
    values (v_org, new.id, 'owner');
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9) apply_orcamento_update: autorização por membro da org do orçamento
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

grant execute on function public.apply_orcamento_update(uuid, text, date, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 10) consume_openrouter_chat_rate por organização
-- ---------------------------------------------------------------------------
drop function if exists public.consume_openrouter_chat_rate(int, int);

create or replace function public.consume_openrouter_chat_rate(
  p_organization_id uuid,
  p_max int,
  p_window_seconds int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.openrouter_chat_rate%rowtype;
  v_now timestamptz := clock_timestamp();
  v_elapsed double precision;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id and m.user_id = v_uid
  ) then
    raise exception 'forbidden';
  end if;

  if p_max < 1 or p_window_seconds < 1 then
    raise exception 'invalid rate parameters';
  end if;

  select * into v_row from public.openrouter_chat_rate where organization_id = p_organization_id for update;

  if not found then
    insert into public.openrouter_chat_rate (organization_id, window_started_at, requests)
    values (p_organization_id, v_now, 1);
    return jsonb_build_object('allowed', true, 'remaining', p_max - 1);
  end if;

  v_elapsed := extract(epoch from (v_now - v_row.window_started_at));

  if v_elapsed >= p_window_seconds then
    update public.openrouter_chat_rate
    set window_started_at = v_now, requests = 1
    where organization_id = p_organization_id;
    return jsonb_build_object('allowed', true, 'remaining', p_max - 1);
  end if;

  if v_row.requests >= p_max then
    return jsonb_build_object(
      'allowed', false,
      'retry_after_seconds', greatest(1, ceil(p_window_seconds - v_elapsed)::int)
    );
  end if;

  update public.openrouter_chat_rate set requests = requests + 1 where organization_id = p_organization_id;
  return jsonb_build_object('allowed', true, 'remaining', p_max - v_row.requests - 1);
end;
$$;

grant execute on function public.consume_openrouter_chat_rate(uuid, int, int) to authenticated;

comment on function public.consume_openrouter_chat_rate(uuid, int, int) is
  'Rate limit OpenRouter por organização; exige membro.';

-- ---------------------------------------------------------------------------
-- 11) Listagens e KPIs de clientes (assinatura com p_organization_id)
-- ---------------------------------------------------------------------------
drop function if exists public.list_clientes_com_ultimo_contato(boolean);

create or replace function public.list_clientes_com_ultimo_contato(
  p_organization_id uuid,
  p_ativos_apenas boolean default false
)
returns table (
  id uuid,
  user_id uuid,
  organization_id uuid,
  nome text,
  tipo text,
  tax_id text,
  document_enrichment jsonb,
  ativo boolean,
  whatsapp text,
  telefone text,
  produtos_habituais text,
  observacoes text,
  cor text,
  iniciais text,
  created_at timestamptz,
  updated_at timestamptz,
  ultimo_contato timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    c.id,
    c.user_id,
    c.organization_id,
    c.nome,
    c.tipo,
    c.tax_id,
    c.document_enrichment,
    c.ativo,
    c.whatsapp,
    c.telefone,
    c.produtos_habituais,
    c.observacoes,
    c.cor,
    c.iniciais,
    c.created_at,
    c.updated_at,
    (
      select max(i.data_contato)
      from public.interacoes i
      where i.cliente_id = c.id
        and i.organization_id = c.organization_id
    ) as ultimo_contato
  from public.clientes c
  where c.organization_id = p_organization_id
    and exists (
      select 1 from public.organization_members m
      where m.organization_id = p_organization_id and m.user_id = (select auth.uid())
    )
    and (not p_ativos_apenas or c.ativo = true)
  order by c.nome asc;
$$;

comment on function public.list_clientes_com_ultimo_contato(uuid, boolean) is
  'Lista clientes da organização com último contacto; exige membro.';

grant execute on function public.list_clientes_com_ultimo_contato(uuid, boolean) to authenticated;

drop function if exists public.list_clientes_com_ultimo_contato_page(boolean, int, text, uuid);

create or replace function public.list_clientes_com_ultimo_contato_page(
  p_organization_id uuid,
  p_ativos_apenas boolean default false,
  p_limit int default 150,
  p_cursor_nome text default null,
  p_cursor_id uuid default null
)
returns table (
  id uuid,
  user_id uuid,
  organization_id uuid,
  nome text,
  tipo text,
  tax_id text,
  document_enrichment jsonb,
  ativo boolean,
  whatsapp text,
  telefone text,
  produtos_habituais text,
  observacoes text,
  cor text,
  iniciais text,
  created_at timestamptz,
  updated_at timestamptz,
  ultimo_contato timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    c.id,
    c.user_id,
    c.organization_id,
    c.nome,
    c.tipo,
    c.tax_id,
    c.document_enrichment,
    c.ativo,
    c.whatsapp,
    c.telefone,
    c.produtos_habituais,
    c.observacoes,
    c.cor,
    c.iniciais,
    c.created_at,
    c.updated_at,
    (
      select max(i.data_contato)
      from public.interacoes i
      where i.cliente_id = c.id
        and i.organization_id = c.organization_id
    ) as ultimo_contato
  from public.clientes c
  where c.organization_id = p_organization_id
    and exists (
      select 1 from public.organization_members m
      where m.organization_id = p_organization_id and m.user_id = (select auth.uid())
    )
    and (not p_ativos_apenas or c.ativo = true)
    and (
      (p_cursor_nome is null and p_cursor_id is null)
      or (c.nome, c.id) > (p_cursor_nome, p_cursor_id)
    )
  order by c.nome asc, c.id asc
  limit least(greatest(coalesce(p_limit, 150), 1), 500);
$$;

grant execute on function public.list_clientes_com_ultimo_contato_page(uuid, boolean, int, text, uuid) to authenticated;

drop function if exists public.clientes_kpis_summary();

create or replace function public.clientes_kpis_summary(p_organization_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'ativos', count(*) filter (where c.ativo),
    'arquivados', count(*) filter (where not c.ativo),
    'recompras', count(*) filter (where c.ativo and c.tipo = 'recompra'),
    'com_telefone', count(*) filter (where c.ativo and (
      length(regexp_replace(coalesce(c.whatsapp, ''), '[^0-9]', '', 'g')) >= 8
      or length(regexp_replace(coalesce(c.telefone, ''), '[^0-9]', '', 'g')) >= 8
    )),
    'sem_contato_30', count(*) filter (where c.ativo and not exists (
      select 1
      from public.interacoes i
      where i.cliente_id = c.id
        and i.organization_id = c.organization_id
        and i.data_contato >= (now() - interval '30 days')
    ))
  )
  from public.clientes c
  where c.organization_id = p_organization_id
    and exists (
      select 1 from public.organization_members m
      where m.organization_id = p_organization_id and m.user_id = (select auth.uid())
    );
$$;

grant execute on function public.clientes_kpis_summary(uuid) to authenticated;

drop function if exists public.import_clientes_batch(jsonb);

create or replace function public.import_clientes_batch(
  p_organization_id uuid,
  p_rows jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  elem jsonb;
  idx int := 0;
  n_ok int := 0;
  errs jsonb := '[]'::jsonb;
  uid uuid := auth.uid();
  v_tipo text;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id and m.user_id = uid
  ) then
    raise exception 'forbidden';
  end if;

  for elem in select jsonb_array_elements(coalesce(p_rows, '[]'::jsonb))
  loop
    begin
      v_tipo := lower(trim(coalesce(elem->>'tipo', 'novo')));
      if v_tipo not in ('novo', 'recompra') then
        v_tipo := 'novo';
      end if;

      insert into public.clientes (
        user_id,
        organization_id,
        nome,
        tipo,
        tax_id,
        document_enrichment,
        ativo,
        whatsapp,
        telefone,
        produtos_habituais,
        observacoes,
        cor,
        iniciais
      ) values (
        uid,
        p_organization_id,
        trim(elem->>'nome'),
        v_tipo,
        nullif(trim(elem->>'tax_id'), ''),
        case
          when elem ? 'document_enrichment' and jsonb_typeof(elem->'document_enrichment') = 'object'
          then elem->'document_enrichment'
          else null
        end,
        case
          when elem ? 'ativo' and (elem->>'ativo') in ('true', 'false')
          then (elem->>'ativo')::boolean
          else true
        end,
        nullif(trim(elem->>'whatsapp'), ''),
        nullif(trim(elem->>'telefone'), ''),
        nullif(trim(elem->>'produtos_habituais'), ''),
        nullif(trim(elem->>'observacoes'), ''),
        nullif(trim(elem->>'cor'), ''),
        nullif(trim(elem->>'iniciais'), '')
      );

      n_ok := n_ok + 1;
    exception
      when unique_violation then
        errs := errs || jsonb_build_array(jsonb_build_object(
          'index', idx,
          'msg', 'Documento duplicado (CPF/CNPJ já existe).'
        ));
      when others then
        errs := errs || jsonb_build_array(jsonb_build_object('index', idx, 'msg', SQLERRM));
    end;

    idx := idx + 1;
  end loop;

  return jsonb_build_object('inserted', n_ok, 'errors', errs);
end;
$$;

grant execute on function public.import_clientes_batch(uuid, jsonb) to authenticated;
