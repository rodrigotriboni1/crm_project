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
