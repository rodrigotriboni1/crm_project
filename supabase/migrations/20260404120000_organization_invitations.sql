-- Convites à organização: token opaco (hash SHA-256), aceitação no signup via raw_user_meta_data.invite_token.
-- Extensão para digest / bytes aleatórios.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Tabela (acesso só via RPCs SECURITY DEFINER; RLS sem políticas = nega cliente direto)
-- ---------------------------------------------------------------------------
create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  token_hash text not null,
  invited_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  constraint organization_invitations_token_hash_uidx unique (token_hash)
);

create unique index if not exists organization_invitations_org_email_active_uidx
  on public.organization_invitations (organization_id, lower(trim(email)))
  where accepted_at is null and revoked_at is null;

create index if not exists organization_invitations_org_idx
  on public.organization_invitations (organization_id);

comment on table public.organization_invitations is
  'Convite por e-mail; token só na criação; aceite no trigger handle_new_user com e-mail coincidente.';

alter table public.organization_invitations enable row level security;

revoke all on table public.organization_invitations from public;

-- ---------------------------------------------------------------------------
-- Hash do token (mesmo algoritmo no preview e no trigger)
-- ---------------------------------------------------------------------------
create or replace function public.organization_invitation_hash_token(p_token text)
returns text
language sql
immutable
security definer
set search_path = public
as $$
  select case
    when nullif(trim(p_token), '') is null then null::text
    else encode(
      extensions.digest(convert_to(trim(p_token), 'UTF8'), 'sha256'),
      'hex'
    )
  end;
$$;

revoke all on function public.organization_invitation_hash_token(text) from public;

-- ---------------------------------------------------------------------------
-- Convite ou adicionar membro existente (owner)
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
begin
  if v_actor is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if v_email = '' or position('@' in v_email) < 2 then
    return jsonb_build_object('ok', false, 'error', 'invalid_email');
  end if;

  if not exists (
    select 1 from public.organization_members
    where organization_id = p_organization_id
      and user_id = v_actor
      and role = 'owner'
  ) then
    return jsonb_build_object('ok', false, 'error', 'not_owner');
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

revoke all on function public.invite_or_add_organization_member(uuid, text) from public;
grant execute on function public.invite_or_add_organization_member(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Listar convites (owner)
-- ---------------------------------------------------------------------------
create or replace function public.list_organization_invitations(p_organization_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1 from public.organization_members
    where organization_id = p_organization_id
      and user_id = v_uid
      and role = 'owner'
  ) then
    raise exception 'forbidden';
  end if;

  return coalesce(
    (
      select jsonb_agg(x.row_data order by x.sort_created desc)
      from (
        select
          jsonb_build_object(
            'id', i.id,
            'email', i.email,
            'status',
            case
              when i.accepted_at is not null then 'accepted'
              when i.revoked_at is not null then 'revoked'
              when i.expires_at < now() then 'expired'
              else 'pending'
            end,
            'created_at', i.created_at,
            'expires_at', i.expires_at,
            'accepted_at', i.accepted_at,
            'invited_by_email', u.email::text
          ) as row_data,
          i.created_at as sort_created
        from public.organization_invitations i
        left join auth.users u on u.id = i.invited_by
        where i.organization_id = p_organization_id
      ) x
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.list_organization_invitations(uuid) from public;
grant execute on function public.list_organization_invitations(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Revogar convite (owner da org do convite)
-- ---------------------------------------------------------------------------
create or replace function public.revoke_organization_invitation(p_invitation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select organization_id into v_org
  from public.organization_invitations
  where id = p_invitation_id;

  if v_org is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if not exists (
    select 1 from public.organization_members
    where organization_id = v_org
      and user_id = v_uid
      and role = 'owner'
  ) then
    return jsonb_build_object('ok', false, 'error', 'not_owner');
  end if;

  update public.organization_invitations
  set revoked_at = now()
  where id = p_invitation_id
    and accepted_at is null
    and revoked_at is null;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_revokable');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.revoke_organization_invitation(uuid) from public;
grant execute on function public.revoke_organization_invitation(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Preview do convite (anon + authenticated) — requer token válido
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
    and i.expires_at > now();

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

-- ---------------------------------------------------------------------------
-- Trigger: perfil + convite OU organização por defeito
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
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

comment on function public.invite_or_add_organization_member(uuid, text) is
  'Owner: adiciona utilizador Auth existente ou cria convite com token (14 dias).';
comment on function public.preview_organization_invitation(text) is
  'Valida token e devolve nome da org e e-mail do convite para a página /join.';
