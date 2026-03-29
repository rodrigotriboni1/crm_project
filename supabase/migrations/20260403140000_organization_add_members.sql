-- Membros da mesma org visíveis sem recursão RLS: helper SECURITY DEFINER.
-- RPCs: listar equipa e adicionar por e-mail (só owner).

create or replace function public.current_user_organization_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.organization_members
  where user_id = (select auth.uid());
$$;

revoke all on function public.current_user_organization_ids() from public;
grant execute on function public.current_user_organization_ids() to authenticated;

drop policy if exists "organization_members_select_own" on public.organization_members;

create policy "organization_members_select_visible"
  on public.organization_members for select
  using (
    organization_id in (select public.current_user_organization_ids())
  );

comment on function public.current_user_organization_ids() is
  'IDs das organizações do utilizador; usado em RLS para evitar subconsulta recursiva em organization_members.';

-- ---------------------------------------------------------------------------
-- Listar membros (e-mail + nome) — qualquer membro da org pode ver.
-- ---------------------------------------------------------------------------
create or replace function public.list_organization_members(p_organization_id uuid)
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
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id and m.user_id = v_uid
  ) then
    raise exception 'forbidden';
  end if;

  return coalesce(
    (
      select jsonb_agg(x.row_data order by x.sort_role, x.sort_email)
      from (
        select
          jsonb_build_object(
            'user_id', m.user_id,
            'email', u.email::text,
            'full_name', p.full_name,
            'role', m.role
          ) as row_data,
          case when m.role = 'owner' then 0 else 1 end as sort_role,
          coalesce(u.email::text, '') as sort_email
        from public.organization_members m
        inner join auth.users u on u.id = m.user_id
        left join public.profiles p on p.id = m.user_id
        where m.organization_id = p_organization_id
      ) x
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.list_organization_members(uuid) from public;
grant execute on function public.list_organization_members(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Adicionar membro pelo e-mail do Auth — só owner da organização.
-- ---------------------------------------------------------------------------
create or replace function public.add_organization_member_by_email(
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
  v_target uuid;
  v_email text := lower(trim(coalesce(p_email, '')));
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
  where lower(trim(email)) = v_email
  limit 1;

  if v_target is null then
    return jsonb_build_object('ok', false, 'error', 'user_not_found');
  end if;

  if exists (
    select 1 from public.organization_members
    where organization_id = p_organization_id and user_id = v_target
  ) then
    return jsonb_build_object('ok', false, 'error', 'already_member');
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (p_organization_id, v_target, 'member');

  return jsonb_build_object('ok', true, 'user_id', v_target);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'already_member');
end;
$$;

revoke all on function public.add_organization_member_by_email(uuid, text) from public;
grant execute on function public.add_organization_member_by_email(uuid, text) to authenticated;

comment on function public.list_organization_members(uuid) is
  'Lista membros da organização (email, nome, papel); requer ser membro.';

comment on function public.add_organization_member_by_email(uuid, text) is
  'Adiciona utilizador existente (auth) como member; só owner.';
