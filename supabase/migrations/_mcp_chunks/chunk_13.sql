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
