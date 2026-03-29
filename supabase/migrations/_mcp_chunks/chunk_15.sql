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
