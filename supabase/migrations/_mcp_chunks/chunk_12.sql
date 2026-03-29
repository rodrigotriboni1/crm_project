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
