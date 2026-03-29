create or replace function public.trg_organization_members_audit() returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if tg_op = 'INSERT' then
    perform public.log_organization_audit(new.organization_id, 'member_added', new.user_id,
      jsonb_build_object('role', new.role, 'data_scope', new.data_scope));
  elsif tg_op = 'UPDATE' then
    perform public.log_organization_audit(new.organization_id, 'member_updated', new.user_id,
      jsonb_build_object('role_before', old.role, 'role_after', new.role, 'data_scope_before', old.data_scope, 'data_scope_after', new.data_scope));
  elsif tg_op = 'DELETE' then
    perform public.log_organization_audit(old.organization_id, 'member_removed', old.user_id, jsonb_build_object('role', old.role));
  end if;
  return coalesce(new, old);
end;
$fn$;
drop trigger if exists organization_members_audit on public.organization_members;
create trigger organization_members_audit after insert or update or delete on public.organization_members
  for each row execute function public.trg_organization_members_audit();
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
