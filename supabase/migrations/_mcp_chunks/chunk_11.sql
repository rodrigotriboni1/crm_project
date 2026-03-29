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
