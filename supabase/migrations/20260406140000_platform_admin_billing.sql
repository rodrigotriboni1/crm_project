-- Platform admins, billing fields, suspended-org isolation, seat limits, signup without default org.

-- ---------------------------------------------------------------------------
-- 1) Platform administrators (internal EmbalaFlow operators)
-- ---------------------------------------------------------------------------
create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.platform_admins is
  'Utilizadores Auth com acesso à consola interna e RPCs admin (criar empresas, convites globais).';

alter table public.platform_admins enable row level security;

-- No direct reads for authenticated; use is_platform_admin() RPC.
revoke all on table public.platform_admins from authenticated, anon;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins p
    where p.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Organizations: lifecycle + entitlements
-- ---------------------------------------------------------------------------
alter table public.organizations
  add column if not exists status text not null default 'active'
    check (status in ('active', 'suspended', 'trial'));

alter table public.organizations
  add column if not exists plan_tier text not null default 'starter'
    check (plan_tier in ('starter', 'pro'));

alter table public.organizations
  add column if not exists seat_limit int not null default 5
    check (seat_limit >= 1);

alter table public.organizations
  add column if not exists ai_chat_max_per_window int not null default 30
    check (ai_chat_max_per_window >= 1);

alter table public.organizations
  add column if not exists ai_chat_window_seconds int not null default 3600
    check (ai_chat_window_seconds >= 60);

comment on column public.organizations.status is 'active/trial: acesso CRM; suspended: bloqueado.';
comment on column public.organizations.seat_limit is 'Máximo de membros; sincronizado com Stripe ou definido manualmente.';
comment on column public.organizations.ai_chat_max_per_window is 'Pedidos IA permitidos por janela (por organização).';

update public.organizations
set
  status = 'active',
  plan_tier = 'pro',
  seat_limit = greatest(seat_limit, 100),
  ai_chat_max_per_window = greatest(ai_chat_max_per_window, 120),
  ai_chat_window_seconds = 3600
where true;

-- ---------------------------------------------------------------------------
-- 3) Stripe mirror (webhook atualiza isto + seat_limit / plan_tier)
-- ---------------------------------------------------------------------------
create table if not exists public.organization_billing (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text,
  subscription_status text,
  seat_quantity int,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists organization_billing_stripe_customer_idx
  on public.organization_billing (stripe_customer_id)
  where stripe_customer_id is not null;

comment on table public.organization_billing is
  'Dados de cobrança Stripe por organização; escrita via Edge webhook (service role).';

alter table public.organization_billing enable row level security;
revoke all on table public.organization_billing from authenticated, anon;

-- ---------------------------------------------------------------------------
-- 4) Membros só acedem a organizações activas ou em trial
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
  where m.user_id = (select auth.uid())
    and o.status in ('active', 'trial');
$$;

-- ---------------------------------------------------------------------------
-- 5) create_organization — descontinuada no CRM (provisão via consola admin ou convite)
-- ---------------------------------------------------------------------------
create or replace function public.create_organization(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'forbidden'
    using detail = 'organizations are created in the admin console (admin_create_organization) or users join via invitation';
end;
$$;

-- ---------------------------------------------------------------------------
-- 6) Admin: criar empresa sem forçar o admin a ser owner (apenas provisão)
-- ---------------------------------------------------------------------------
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
  v_email text := lower(trim(coalesce(p_initial_owner_email, '')));
  v_token text;
  v_hash text;
  v_invite_id uuid;
  v_expires timestamptz := now() + interval '14 days';
begin
  if v_actor is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if not exists (select 1 from public.platform_admins where user_id = v_actor) then
    return jsonb_build_object('ok', false, 'error', 'not_platform_admin');
  end if;

  insert into public.organizations (name, status, plan_tier, seat_limit)
  values (coalesce(nullif(trim(p_name), ''), 'Empresa'), 'trial', 'starter', 5)
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
      'mode', 'invited_owner',
      'invite_id', v_invite_id,
      'token', v_token
    );
  end if;

  return jsonb_build_object('ok', true, 'organization_id', v_org, 'mode', 'org_only');
end;
$$;

revoke all on function public.admin_create_organization(text, text) from public;
grant execute on function public.admin_create_organization(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 7) Admin: listar organizações
-- ---------------------------------------------------------------------------
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
      select jsonb_agg(
        jsonb_build_object(
          'id', o.id,
          'name', o.name,
          'status', o.status,
          'plan_tier', o.plan_tier,
          'seat_limit', o.seat_limit,
          'member_count', (select count(*)::int from public.organization_members m where m.organization_id = o.id),
          'created_at', o.created_at
        )
        order by o.created_at desc nulls last
      )
      from public.organizations o
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.admin_list_organizations() from public;
grant execute on function public.admin_list_organizations() to authenticated;

-- ---------------------------------------------------------------------------
-- 8) Admin: alterar estado da organização
-- ---------------------------------------------------------------------------
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

  update public.organizations
  set status = p_status, updated_at = now()
  where id = p_organization_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.admin_set_organization_status(uuid, text) from public;
grant execute on function public.admin_set_organization_status(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 9) Platform admin: convite igual ao owner
-- ---------------------------------------------------------------------------
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

  select seat_limit into v_seats from public.organizations where id = p_organization_id;
  if v_seats is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select count(*)::int into v_count from public.organization_members where organization_id = p_organization_id;
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

revoke all on function public.platform_invite_organization_member(uuid, text) from public;
grant execute on function public.platform_invite_organization_member(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 10) Webhook helper: actualizar assentos e plano (service role no Edge)
-- ---------------------------------------------------------------------------
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
begin
  insert into public.organization_billing (
    organization_id,
    stripe_customer_id,
    stripe_subscription_id,
    subscription_status,
    seat_quantity,
    current_period_end,
    updated_at
  )
  values (
    p_organization_id,
    nullif(trim(p_stripe_customer_id), ''),
    nullif(trim(p_stripe_subscription_id), ''),
    nullif(trim(p_subscription_status), ''),
    case when p_seat_quantity is not null and p_seat_quantity > 0 then p_seat_quantity else null end,
    p_current_period_end,
    now()
  )
  on conflict (organization_id) do update set
    stripe_customer_id = coalesce(excluded.stripe_customer_id, public.organization_billing.stripe_customer_id),
    stripe_subscription_id = coalesce(excluded.stripe_subscription_id, public.organization_billing.stripe_subscription_id),
    subscription_status = coalesce(excluded.subscription_status, public.organization_billing.subscription_status),
    seat_quantity = coalesce(excluded.seat_quantity, public.organization_billing.seat_quantity),
    current_period_end = coalesce(excluded.current_period_end, public.organization_billing.current_period_end),
    updated_at = now();

  update public.organizations
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
  where id = p_organization_id;
end;
$$;

revoke all on function public.apply_organization_billing_update(uuid, text, text, text, int, text, timestamptz) from public;
-- apenas service_role (webhook)
grant execute on function public.apply_organization_billing_update(uuid, text, text, text, int, text, timestamptz) to service_role;

-- ---------------------------------------------------------------------------
-- 11) Ler limites IA para a Edge Function (JWT de membro)
-- ---------------------------------------------------------------------------
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
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if not exists (
    select 1 from public.organization_members m
    inner join public.organizations o on o.id = m.organization_id
    where m.organization_id = p_organization_id
      and m.user_id = v_uid
      and o.status in ('active', 'trial')
  ) then
    raise exception 'forbidden';
  end if;

  select o.ai_chat_max_per_window, o.ai_chat_window_seconds
  into v_max, v_sec
  from public.organizations o
  where o.id = p_organization_id;

  return jsonb_build_object(
    'max_requests', coalesce(v_max, 30),
    'window_seconds', coalesce(v_sec, 3600),
    'plan_tier', (select plan_tier from public.organizations where id = p_organization_id)
  );
end;
$$;

revoke all on function public.get_organization_ai_chat_limits(uuid) from public;
grant execute on function public.get_organization_ai_chat_limits(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 12) invite_or_add: limite de seats + org activa
-- ---------------------------------------------------------------------------
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
begin
  if v_actor is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if v_email = '' or position('@' in v_email) < 2 then
    return jsonb_build_object('ok', false, 'error', 'invalid_email');
  end if;

  select exists (
    select 1 from public.organizations o
    where o.id = p_organization_id and o.status in ('active', 'trial')
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

  select seat_limit into v_seats from public.organizations where id = p_organization_id;
  select count(*)::int into v_count from public.organization_members where organization_id = p_organization_id;
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

-- ---------------------------------------------------------------------------
-- 13) handle_new_user: sem organização por defeito (só convite)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text := new.raw_user_meta_data->>'invite_token';
  v_hash text;
  v_inv public.organization_invitations%rowtype;
  v_email text := lower(trim(coalesce(new.email, '')));
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;

  if v_token is not null and length(trim(v_token)) > 0 and v_email <> '' then
    v_hash := public.organization_invitation_hash_token(v_token);

    select * into v_inv
    from public.organization_invitations
    where token_hash = v_hash
      and accepted_at is null
      and revoked_at is null
      and expires_at > now();

    if found then
      if lower(trim(v_inv.email)) = v_email then
        if exists (
          select 1 from public.organization_members
          where organization_id = v_inv.organization_id and user_id = new.id
        ) then
          update public.organization_invitations
          set accepted_at = now()
          where id = v_inv.id;
          return new;
        end if;

        insert into public.organization_members (organization_id, user_id, role)
        values (v_inv.organization_id, new.id, coalesce(nullif(v_inv.role, ''), 'member'));

        update public.organization_invitations
        set accepted_at = now()
        where id = v_inv.id;

        return new;
      end if;
    end if;
  end if;

  -- Sem convite: perfil apenas; utilizador deve receber convite ou ser adicionado por admin.
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 14) consume_openrouter_chat_rate: org activa + limites vindos do pedido (Edge aplica get_organization_ai_chat_limits antes)
-- ---------------------------------------------------------------------------
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
    inner join public.organizations o on o.id = m.organization_id
    where m.organization_id = p_organization_id
      and m.user_id = v_uid
      and o.status in ('active', 'trial')
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

comment on function public.admin_create_organization(text, text) is
  'Platform admin: cria empresa; opcionalmente convite owner por e-mail.';

-- ---------------------------------------------------------------------------
-- 15) Preview convite: organização tem de estar activa ou em trial
-- ---------------------------------------------------------------------------
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
  where i.token_hash = v_hash
    and i.accepted_at is null
    and i.revoked_at is null
    and i.expires_at > now()
    and o.status in ('active', 'trial');

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

revoke all on function public.preview_organization_invitation(text) from public;
grant execute on function public.preview_organization_invitation(text) to anon, authenticated;
