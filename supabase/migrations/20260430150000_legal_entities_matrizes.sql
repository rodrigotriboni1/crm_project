-- Legal entities (CNPJ/CPF guarda-chuva: billing, plano, suspensão) + unidades (organizations) com dados CRM.
-- Migra 1 legal_entity por organization existente; billing passa a PK legal_entity_id.

-- ---------------------------------------------------------------------------
-- 1) Tabela legal_entities
-- ---------------------------------------------------------------------------
create table if not exists public.legal_entities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tax_id_type text,
  tax_id text,
  status text not null default 'trial'
    check (status in ('active', 'suspended', 'trial')),
  plan_tier text not null default 'starter'
    check (plan_tier in ('starter', 'pro')),
  seat_limit int not null default 5
    check (seat_limit >= 1),
  ai_chat_max_per_window int not null default 30
    check (ai_chat_max_per_window >= 1),
  ai_chat_window_seconds int not null default 3600
    check (ai_chat_window_seconds >= 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint legal_entities_tax_id_type_check
    check (tax_id_type is null or tax_id_type in ('cnpj', 'cpf'))
);

create unique index if not exists legal_entities_tax_id_uidx
  on public.legal_entities (tax_id)
  where tax_id is not null and btrim(tax_id) <> '';

comment on table public.legal_entities is
  'Entidade legal (empresa CNPJ ou MEI CPF): plano, lugares, suspensão; várias unidades (organizations) por entidade.';

grant select on table public.legal_entities to authenticated;

alter table public.legal_entities enable row level security;

create policy legal_entities_select_member
  on public.legal_entities for select
  using (
    id in (
      select o.legal_entity_id
      from public.organization_members m
      inner join public.organizations o on o.id = m.organization_id
      where m.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 2) organizations.legal_entity_id + backfill 1:1
-- ---------------------------------------------------------------------------
alter table public.organizations
  add column if not exists legal_entity_id uuid references public.legal_entities (id);

do $$
declare
  r record;
  v_le uuid;
begin
  for r in
    select id from public.organizations where legal_entity_id is null order by created_at
  loop
    insert into public.legal_entities (
      name,
      status,
      plan_tier,
      seat_limit,
      ai_chat_max_per_window,
      ai_chat_window_seconds,
      created_at,
      updated_at
    )
    select
      o.name,
      o.status,
      o.plan_tier,
      o.seat_limit,
      o.ai_chat_max_per_window,
      o.ai_chat_window_seconds,
      o.created_at,
      o.updated_at
    from public.organizations o
    where o.id = r.id
    returning id into v_le;

    update public.organizations
    set legal_entity_id = v_le
    where id = r.id;
  end loop;
end $$;

do $$
begin
  if exists (select 1 from public.organizations where legal_entity_id is null) then
    raise exception 'backfill failed: organizations.legal_entity_id still null';
  end if;
end $$;

alter table public.organizations
  alter column legal_entity_id set not null;

create index if not exists organizations_legal_entity_id_idx
  on public.organizations (legal_entity_id);

-- ---------------------------------------------------------------------------
-- 3) organization_billing -> legal_entity_billing (PK legal_entity_id)
-- ---------------------------------------------------------------------------
create table if not exists public.legal_entity_billing (
  legal_entity_id uuid primary key references public.legal_entities (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text,
  subscription_status text,
  seat_quantity int,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists legal_entity_billing_stripe_customer_idx
  on public.legal_entity_billing (stripe_customer_id)
  where stripe_customer_id is not null;

comment on table public.legal_entity_billing is
  'Espelho Stripe por entidade legal; escrita via Edge webhook (service role).';

alter table public.legal_entity_billing enable row level security;
revoke all on table public.legal_entity_billing from authenticated, anon;

insert into public.legal_entity_billing (
  legal_entity_id,
  stripe_customer_id,
  stripe_subscription_id,
  subscription_status,
  seat_quantity,
  current_period_end,
  updated_at
)
select
  o.legal_entity_id,
  ob.stripe_customer_id,
  ob.stripe_subscription_id,
  ob.subscription_status,
  ob.seat_quantity,
  ob.current_period_end,
  ob.updated_at
from public.organization_billing ob
inner join public.organizations o on o.id = ob.organization_id
on conflict (legal_entity_id) do update set
  stripe_customer_id = coalesce(excluded.stripe_customer_id, public.legal_entity_billing.stripe_customer_id),
  stripe_subscription_id = coalesce(excluded.stripe_subscription_id, public.legal_entity_billing.stripe_subscription_id),
  subscription_status = coalesce(excluded.subscription_status, public.legal_entity_billing.subscription_status),
  seat_quantity = coalesce(excluded.seat_quantity, public.legal_entity_billing.seat_quantity),
  current_period_end = coalesce(excluded.current_period_end, public.legal_entity_billing.current_period_end),
  updated_at = excluded.updated_at;

drop table if exists public.organization_billing;

-- ---------------------------------------------------------------------------
-- 4) Remover colunas duplicadas de organizations (passam a legal_entities)
-- ---------------------------------------------------------------------------
alter table public.organizations drop column if exists status;
alter table public.organizations drop column if exists plan_tier;
alter table public.organizations drop column if exists seat_limit;
alter table public.organizations drop column if exists ai_chat_max_per_window;
alter table public.organizations drop column if exists ai_chat_window_seconds;

comment on table public.organizations is
  'Unidade operacional / matriz de dados CRM; tenant de clientes/orçamentos; pertence a uma legal_entity.';

-- ---------------------------------------------------------------------------
-- 5) Funções actualizadas
-- ---------------------------------------------------------------------------
create or replace function public.current_user_organization_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.organization_id
  from public.organization_members m
  inner join public.organizations o on o.id = m.organization_id
  inner join public.legal_entities le on le.id = o.legal_entity_id
  where m.user_id = (select auth.uid())
    and le.status in ('active', 'trial');
$$;

create or replace function public.admin_create_organization(
  p_name text,
  p_initial_owner_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := auth.uid();
  v_org uuid;
  v_le uuid;
  v_email text := lower(trim(coalesce(p_initial_owner_email, '')));
  v_token text;
  v_hash text;
  v_invite_id uuid;
  v_expires timestamptz := now() + interval '14 days';
  v_trim_name text := coalesce(nullif(trim(p_name), ''), 'Empresa');
begin
  if v_actor is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if not exists (select 1 from public.platform_admins where user_id = v_actor) then
    return jsonb_build_object('ok', false, 'error', 'not_platform_admin');
  end if;

  insert into public.legal_entities (name, status, plan_tier, seat_limit)
  values (v_trim_name, 'trial', 'starter', 5)
  returning id into v_le;

  insert into public.organizations (name, legal_entity_id)
  values (v_trim_name, v_le)
  returning id into v_org;

  if v_email <> '' and position('@' in v_email) >= 2 then
    v_token := encode(extensions.gen_random_bytes(32), 'hex');
    v_hash := public.organization_invitation_hash_token(v_token);

    insert into public.organization_invitations (
      organization_id,
      email,
      role,
      token_hash,
      invited_by,
      expires_at
    )
    values (
      v_org,
      v_email,
      'owner',
      v_hash,
      v_actor,
      v_expires
    )
    returning id into v_invite_id;

    return jsonb_build_object(
      'ok', true,
      'organization_id', v_org,
      'legal_entity_id', v_le,
      'mode', 'invited_owner',
      'invite_id', v_invite_id,
      'token', v_token
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'organization_id', v_org,
    'legal_entity_id', v_le,
    'mode', 'org_only'
  );
end;
$$;

create or replace function public.admin_list_organizations()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'not authenticated';
  end if;
  if not exists (select 1 from public.platform_admins where user_id = v_actor) then
    raise exception 'forbidden';
  end if;

  return coalesce(
    (
      select jsonb_agg(x.obj order by x.le_name, x.unit_name)
      from (
        select
          le.name as le_name,
          o.name as unit_name,
          jsonb_build_object(
            'id', o.id,
            'name', o.name,
            'legal_entity_id', le.id,
            'legal_entity_name', le.name,
            'tax_id_type', le.tax_id_type,
            'tax_id', le.tax_id,
            'status', le.status,
            'plan_tier', le.plan_tier,
            'seat_limit', le.seat_limit,
            'member_count', (
              select count(*)::int
              from public.organization_members m2
              where m2.organization_id = o.id
            ),
            'legal_entity_member_count', (
              select count(distinct m3.user_id)::int
              from public.organization_members m3
              inner join public.organizations o3 on o3.id = m3.organization_id
              where o3.legal_entity_id = le.id
            ),
            'created_at', o.created_at
          ) as obj
        from public.organizations o
        inner join public.legal_entities le on le.id = o.legal_entity_id
      ) x
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.admin_set_organization_status(
  p_organization_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_le uuid;
begin
  if v_actor is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if not exists (select 1 from public.platform_admins where user_id = v_actor) then
    return jsonb_build_object('ok', false, 'error', 'not_platform_admin');
  end if;
  if p_status is null or p_status not in ('active', 'suspended', 'trial') then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;

  select o.legal_entity_id into v_le
  from public.organizations o
  where o.id = p_organization_id;

  if v_le is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  update public.legal_entities
  set status = p_status, updated_at = now()
  where id = v_le;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.platform_invite_organization_member(
  p_organization_id uuid,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := auth.uid();
  v_email text := lower(trim(coalesce(p_email, '')));
  v_target uuid;
  v_token text;
  v_hash text;
  v_invite_id uuid;
  v_expires timestamptz := now() + interval '14 days';
  v_seats int;
  v_count int;
  v_le uuid;
begin
  if v_actor is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if not exists (select 1 from public.platform_admins where user_id = v_actor) then
    return jsonb_build_object('ok', false, 'error', 'not_platform_admin');
  end if;

  if v_email = '' or position('@' in v_email) < 2 then
    return jsonb_build_object('ok', false, 'error', 'invalid_email');
  end if;

  select o.legal_entity_id into v_le
  from public.organizations o
  where o.id = p_organization_id;

  if v_le is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select le.seat_limit into v_seats
  from public.legal_entities le
  where le.id = v_le;

  select count(distinct m.user_id)::int into v_count
  from public.organization_members m
  inner join public.organizations o2 on o2.id = m.organization_id
  where o2.legal_entity_id = v_le;

  if v_count >= v_seats then
    return jsonb_build_object('ok', false, 'error', 'seat_limit_reached');
  end if;

  select id into v_target
  from auth.users
  where lower(trim(email::text)) = v_email
  limit 1;

  if v_target is not null then
    if exists (
      select 1 from public.organization_members
      where organization_id = p_organization_id and user_id = v_target
    ) then
      return jsonb_build_object('ok', false, 'error', 'already_member');
    end if;

    insert into public.organization_members (organization_id, user_id, role)
    values (p_organization_id, v_target, 'member');

    return jsonb_build_object('ok', true, 'mode', 'added_existing', 'user_id', v_target);
  end if;

  update public.organization_invitations
  set revoked_at = now()
  where organization_id = p_organization_id
    and lower(trim(email)) = v_email
    and accepted_at is null
    and revoked_at is null;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_hash := public.organization_invitation_hash_token(v_token);

  insert into public.organization_invitations (
    organization_id,
    email,
    role,
    token_hash,
    invited_by,
    expires_at
  )
  values (
    p_organization_id,
    v_email,
    'member',
    v_hash,
    v_actor,
    v_expires
  )
  returning id into v_invite_id;

  return jsonb_build_object(
    'ok', true,
    'mode', 'invited',
    'invite_id', v_invite_id,
    'token', v_token
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'invite_conflict');
end;
$$;

create or replace function public.apply_organization_billing_update(
  p_organization_id uuid,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_subscription_status text,
  p_seat_quantity int,
  p_plan_tier text,
  p_current_period_end timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_le uuid;
begin
  select o.legal_entity_id into v_le
  from public.organizations o
  where o.id = p_organization_id;

  if v_le is null then
    raise exception 'organization not found';
  end if;

  insert into public.legal_entity_billing (
    legal_entity_id,
    stripe_customer_id,
    stripe_subscription_id,
    subscription_status,
    seat_quantity,
    current_period_end,
    updated_at
  )
  values (
    v_le,
    nullif(trim(p_stripe_customer_id), ''),
    nullif(trim(p_stripe_subscription_id), ''),
    nullif(trim(p_subscription_status), ''),
    case when p_seat_quantity is not null and p_seat_quantity > 0 then p_seat_quantity else null end,
    p_current_period_end,
    now()
  )
  on conflict (legal_entity_id) do update set
    stripe_customer_id = coalesce(excluded.stripe_customer_id, public.legal_entity_billing.stripe_customer_id),
    stripe_subscription_id = coalesce(excluded.stripe_subscription_id, public.legal_entity_billing.stripe_subscription_id),
    subscription_status = coalesce(excluded.subscription_status, public.legal_entity_billing.subscription_status),
    seat_quantity = coalesce(excluded.seat_quantity, public.legal_entity_billing.seat_quantity),
    current_period_end = coalesce(excluded.current_period_end, public.legal_entity_billing.current_period_end),
    updated_at = now();

  update public.legal_entities
  set
    seat_limit = case
      when p_seat_quantity is not null and p_seat_quantity > 0 then greatest(p_seat_quantity, 1)
      else seat_limit
    end,
    plan_tier = case
      when p_plan_tier in ('starter', 'pro') then p_plan_tier
      else plan_tier
    end,
    ai_chat_max_per_window = case
      when p_plan_tier = 'pro' then 120
      when p_plan_tier = 'starter' then 30
      else ai_chat_max_per_window
    end,
    updated_at = now()
  where id = v_le;
end;
$$;

create or replace function public.get_organization_ai_chat_limits(p_organization_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_max int;
  v_sec int;
  v_tier text;
  v_le uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select o.legal_entity_id into v_le
  from public.organization_members m
  inner join public.organizations o on o.id = m.organization_id
  inner join public.legal_entities le on le.id = o.legal_entity_id
  where m.organization_id = p_organization_id
    and m.user_id = v_uid
    and le.status in ('active', 'trial');

  if v_le is null then
    raise exception 'forbidden';
  end if;

  select le.ai_chat_max_per_window, le.ai_chat_window_seconds, le.plan_tier
  into v_max, v_sec, v_tier
  from public.legal_entities le
  where le.id = v_le;

  return jsonb_build_object(
    'max_requests', coalesce(v_max, 30),
    'window_seconds', coalesce(v_sec, 3600),
    'plan_tier', coalesce(v_tier, 'starter')
  );
end;
$$;

create or replace function public.invite_or_add_organization_member(
  p_organization_id uuid,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := auth.uid();
  v_email text := lower(trim(coalesce(p_email, '')));
  v_target uuid;
  v_token text;
  v_hash text;
  v_invite_id uuid;
  v_expires timestamptz := now() + interval '14 days';
  v_seats int;
  v_count int;
  v_org_ok boolean;
  v_le uuid;
begin
  if v_actor is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if v_email = '' or position('@' in v_email) < 2 then
    return jsonb_build_object('ok', false, 'error', 'invalid_email');
  end if;

  select exists (
    select 1
    from public.organizations o
    inner join public.legal_entities le on le.id = o.legal_entity_id
    where o.id = p_organization_id and le.status in ('active', 'trial')
  ) into v_org_ok;
  if not v_org_ok then
    return jsonb_build_object('ok', false, 'error', 'org_inactive');
  end if;

  if not exists (
    select 1 from public.organization_members
    where organization_id = p_organization_id
      and user_id = v_actor
      and role = 'owner'
  ) then
    return jsonb_build_object('ok', false, 'error', 'not_owner');
  end if;

  select o.legal_entity_id into v_le
  from public.organizations o
  where o.id = p_organization_id;

  select le.seat_limit into v_seats
  from public.legal_entities le
  where le.id = v_le;

  select count(distinct m.user_id)::int into v_count
  from public.organization_members m
  inner join public.organizations o2 on o2.id = m.organization_id
  where o2.legal_entity_id = v_le;

  if v_count >= v_seats then
    return jsonb_build_object('ok', false, 'error', 'seat_limit_reached');
  end if;

  select id into v_target
  from auth.users
  where lower(trim(email::text)) = v_email
  limit 1;

  if v_target is not null then
    if exists (
      select 1 from public.organization_members
      where organization_id = p_organization_id and user_id = v_target
    ) then
      return jsonb_build_object('ok', false, 'error', 'already_member');
    end if;

    insert into public.organization_members (organization_id, user_id, role)
    values (p_organization_id, v_target, 'member');

    return jsonb_build_object('ok', true, 'mode', 'added_existing', 'user_id', v_target);
  end if;

  update public.organization_invitations
  set revoked_at = now()
  where organization_id = p_organization_id
    and lower(trim(email)) = v_email
    and accepted_at is null
    and revoked_at is null;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_hash := public.organization_invitation_hash_token(v_token);

  insert into public.organization_invitations (
    organization_id,
    email,
    role,
    token_hash,
    invited_by,
    expires_at
  )
  values (
    p_organization_id,
    v_email,
    'member',
    v_hash,
    v_actor,
    v_expires
  )
  returning id into v_invite_id;

  return jsonb_build_object(
    'ok', true,
    'mode', 'invited',
    'invite_id', v_invite_id,
    'token', v_token
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'invite_conflict');
end;
$$;

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
    select 1
    from public.organization_members m
    inner join public.organizations o on o.id = m.organization_id
    inner join public.legal_entities le on le.id = o.legal_entity_id
    where m.organization_id = p_organization_id
      and m.user_id = v_uid
      and le.status in ('active', 'trial')
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

create or replace function public.preview_organization_invitation(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
  v_row record;
begin
  if p_token is null or length(trim(p_token)) < 16 then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  v_hash := public.organization_invitation_hash_token(p_token);

  select i.email, o.name as org_name
  into v_row
  from public.organization_invitations i
  inner join public.organizations o on o.id = i.organization_id
  inner join public.legal_entities le on le.id = o.legal_entity_id
  where i.token_hash = v_hash
    and i.accepted_at is null
    and i.revoked_at is null
    and i.expires_at > now()
    and le.status in ('active', 'trial');

  if v_row.email is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_or_expired');
  end if;

  return jsonb_build_object(
    'ok', true,
    'organization_name', v_row.org_name,
    'email', v_row.email
  );
end;
$$;
