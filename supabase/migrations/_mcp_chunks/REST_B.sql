create or replace function public.list_teams(p_organization_id uuid) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.organization_members m where m.organization_id = p_organization_id and m.user_id = v_uid) then
    raise exception 'forbidden';
  end if;
  return coalesce((select jsonb_agg(row_to_json(x) order by x.name) from (
    select t.id, t.organization_id, t.name, t.leader_user_id, t.is_active, t.created_at,
      (select count(*)::int from public.team_members tm where tm.team_id = t.id) as member_count
    from public.teams t where t.organization_id = p_organization_id) x), '[]'::jsonb);
end;
$fn$;
revoke all on function public.list_teams(uuid) from public;
grant execute on function public.list_teams(uuid) to authenticated;

create or replace function public.create_team(p_organization_id uuid, p_name text) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  if not exists (select 1 from public.organization_members m where m.organization_id = p_organization_id and m.user_id = v_uid and m.role = 'owner') then
    return jsonb_build_object('ok', false, 'error', 'not_owner');
  end if;
  if length(trim(coalesce(p_name, ''))) < 1 then return jsonb_build_object('ok', false, 'error', 'invalid_name'); end if;
  insert into public.teams (organization_id, name) values (p_organization_id, trim(p_name)) returning id into v_id;
  return jsonb_build_object('ok', true, 'team_id', v_id);
end;
$fn$;
revoke all on function public.create_team(uuid, text) from public;
grant execute on function public.create_team(uuid, text) to authenticated;

create or replace function public.delete_team(p_team_id uuid) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v_uid uuid := auth.uid(); v_org uuid;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  select organization_id into v_org from public.teams where id = p_team_id;
  if v_org is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if not exists (select 1 from public.organization_members m where m.organization_id = v_org and m.user_id = v_uid and m.role = 'owner') then
    return jsonb_build_object('ok', false, 'error', 'not_owner');
  end if;
  delete from public.teams where id = p_team_id;
  return jsonb_build_object('ok', true);
end;
$fn$;
revoke all on function public.delete_team(uuid) from public;
grant execute on function public.delete_team(uuid) to authenticated;

create or replace function public.add_team_member_by_email(p_team_id uuid, p_email text) returns jsonb language plpgsql security definer set search_path = public, auth as $fn$
declare v_uid uuid := auth.uid(); v_org uuid; v_target uuid; v_email text := lower(trim(coalesce(p_email, '')));
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  select organization_id into v_org from public.teams where id = p_team_id;
  if v_org is null then return jsonb_build_object('ok', false, 'error', 'team_not_found'); end if;
  if not exists (select 1 from public.organization_members m where m.organization_id = v_org and m.user_id = v_uid and m.role = 'owner') then
    return jsonb_build_object('ok', false, 'error', 'not_owner');
  end if;
  if v_email = '' or position('@' in v_email) < 2 then return jsonb_build_object('ok', false, 'error', 'invalid_email'); end if;
  select id into v_target from auth.users where lower(trim(email::text)) = v_email limit 1;
  if v_target is null then return jsonb_build_object('ok', false, 'error', 'user_not_found'); end if;
  if not exists (select 1 from public.organization_members m where m.organization_id = v_org and m.user_id = v_target) then
    return jsonb_build_object('ok', false, 'error', 'not_org_member');
  end if;
  if exists (select 1 from public.team_members where team_id = p_team_id and user_id = v_target) then
    return jsonb_build_object('ok', false, 'error', 'already_in_team');
  end if;
  insert into public.team_members (team_id, user_id) values (p_team_id, v_target);
  perform public.log_organization_audit(v_org, 'team_member_added', v_target, jsonb_build_object('team_id', p_team_id));
  return jsonb_build_object('ok', true, 'user_id', v_target);
exception when unique_violation then return jsonb_build_object('ok', false, 'error', 'already_in_team');
end;
$fn$;
revoke all on function public.add_team_member_by_email(uuid, text) from public;
grant execute on function public.add_team_member_by_email(uuid, text) to authenticated;

create or replace function public.remove_team_member(p_team_id uuid, p_user_id uuid) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v_uid uuid := auth.uid(); v_org uuid;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  select organization_id into v_org from public.teams where id = p_team_id;
  if v_org is null then return jsonb_build_object('ok', false, 'error', 'team_not_found'); end if;
  if not exists (select 1 from public.organization_members m where m.organization_id = v_org and m.user_id = v_uid and m.role = 'owner') then
    return jsonb_build_object('ok', false, 'error', 'not_owner');
  end if;
  delete from public.team_members where team_id = p_team_id and user_id = p_user_id;
  perform public.log_organization_audit(v_org, 'team_member_removed', p_user_id, jsonb_build_object('team_id', p_team_id));
  return jsonb_build_object('ok', true);
end;
$fn$;
revoke all on function public.remove_team_member(uuid, uuid) from public;
grant execute on function public.remove_team_member(uuid, uuid) to authenticated;

create or replace function public.list_team_members(p_team_id uuid) returns jsonb language plpgsql security definer set search_path = public, auth as $fn$
declare v_uid uuid := auth.uid(); v_org uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select organization_id into v_org from public.teams where id = p_team_id;
  if v_org is null then raise exception 'not_found'; end if;
  if not exists (select 1 from public.organization_members m where m.organization_id = v_org and m.user_id = v_uid) then
    raise exception 'forbidden';
  end if;
  return coalesce((select jsonb_agg(row_to_json(x) order by x.email) from (
    select tm.user_id, tm.status, tm.max_open_leads, tm.joined_at, u.email::text as email, p.full_name
    from public.team_members tm inner join auth.users u on u.id = tm.user_id
    left join public.profiles p on p.id = tm.user_id where tm.team_id = p_team_id) x), '[]'::jsonb);
end;
$fn$;
revoke all on function public.list_team_members(uuid) from public;
grant execute on function public.list_team_members(uuid) to authenticated;
create or replace function public.update_organization_member_data_scope(
  p_organization_id uuid, p_target_user_id uuid, p_data_scope text
) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  if p_data_scope not in ('organization', 'own') then return jsonb_build_object('ok', false, 'error', 'invalid_scope'); end if;
  if not exists (select 1 from public.organization_members m where m.organization_id = p_organization_id and m.user_id = v_uid and m.role = 'owner') then
    return jsonb_build_object('ok', false, 'error', 'not_owner');
  end if;
  if exists (select 1 from public.organization_members m where m.organization_id = p_organization_id and m.user_id = p_target_user_id and m.role = 'owner') then
    return jsonb_build_object('ok', false, 'error', 'cannot_change_owner_scope');
  end if;
  update public.organization_members set data_scope = p_data_scope
  where organization_id = p_organization_id and user_id = p_target_user_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return jsonb_build_object('ok', true);
end;
$fn$;
revoke all on function public.update_organization_member_data_scope(uuid, uuid, text) from public;
grant execute on function public.update_organization_member_data_scope(uuid, uuid, text) to authenticated;

create or replace function public.remove_organization_member(
  p_organization_id uuid, p_target_user_id uuid, p_reassign_user_id uuid
) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v_uid uuid := auth.uid(); v_owner_count int;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  if not exists (select 1 from public.organization_members m where m.organization_id = p_organization_id and m.user_id = v_uid and m.role = 'owner') then
    return jsonb_build_object('ok', false, 'error', 'not_owner');
  end if;
  if p_target_user_id = v_uid then return jsonb_build_object('ok', false, 'error', 'cannot_remove_self_use_leave'); end if;
  if not exists (select 1 from public.organization_members m where m.organization_id = p_organization_id and m.user_id = p_target_user_id) then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if exists (select 1 from public.organization_members m where m.organization_id = p_organization_id and m.user_id = p_target_user_id and m.role = 'owner') then
    select count(*)::int into v_owner_count from public.organization_members where organization_id = p_organization_id and role = 'owner';
    if v_owner_count <= 1 then return jsonb_build_object('ok', false, 'error', 'last_owner'); end if;
  end if;
  if p_reassign_user_id is not null then
    if not exists (select 1 from public.organization_members m where m.organization_id = p_organization_id and m.user_id = p_reassign_user_id) then
      return jsonb_build_object('ok', false, 'error', 'reassign_not_member');
    end if;
    update public.clientes set user_id = p_reassign_user_id, assigned_user_id = p_reassign_user_id, updated_at = now()
    where organization_id = p_organization_id and (user_id = p_target_user_id or assigned_user_id = p_target_user_id);
    update public.orcamentos set user_id = p_reassign_user_id, updated_at = now()
    where organization_id = p_organization_id and user_id = p_target_user_id;
    update public.interacoes set user_id = p_reassign_user_id where organization_id = p_organization_id and user_id = p_target_user_id;
    update public.produtos set user_id = p_reassign_user_id, updated_at = now()
    where organization_id = p_organization_id and user_id = p_target_user_id;
  end if;
  delete from public.team_members tm using public.teams t
  where tm.team_id = t.id and t.organization_id = p_organization_id and tm.user_id = p_target_user_id;
  delete from public.organization_members where organization_id = p_organization_id and user_id = p_target_user_id;
  return jsonb_build_object('ok', true);
end;
$fn$;
revoke all on function public.remove_organization_member(uuid, uuid, uuid) from public;
grant execute on function public.remove_organization_member(uuid, uuid, uuid) to authenticated;

create or replace function public.list_organization_audit_log(p_organization_id uuid, p_limit int default 100)
returns jsonb language plpgsql security definer set search_path = public, auth as $fn$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.organization_members m where m.organization_id = p_organization_id and m.user_id = v_uid and m.role = 'owner') then
    raise exception 'forbidden';
  end if;
  return coalesce((select jsonb_agg(row_to_json(x)) from (
    select l.id, l.action, l.target_user_id, l.detail, l.created_at, u.email::text as actor_email
    from public.organization_audit_log l left join auth.users u on u.id = l.actor_user_id
    where l.organization_id = p_organization_id order by l.created_at desc
    limit least(greatest(coalesce(p_limit, 100), 1), 500)) x), '[]'::jsonb);
end;
$fn$;
revoke all on function public.list_organization_audit_log(uuid, int) from public;
grant execute on function public.list_organization_audit_log(uuid, int) to authenticated;