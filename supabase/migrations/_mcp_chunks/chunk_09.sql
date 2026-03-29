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
