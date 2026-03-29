create or replace function public.log_organization_audit(p_organization_id uuid, p_action text, p_target_user_id uuid, p_detail jsonb)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  insert into public.organization_audit_log (organization_id, actor_user_id, action, target_user_id, detail)
  values (p_organization_id, auth.uid(), p_action, p_target_user_id, p_detail);
end;
$fn$;
revoke all on function public.log_organization_audit(uuid, text, uuid, jsonb) from public;
grant execute on function public.log_organization_audit(uuid, text, uuid, jsonb) to authenticated;
