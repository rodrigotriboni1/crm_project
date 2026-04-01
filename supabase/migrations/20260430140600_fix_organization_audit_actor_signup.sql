-- Signup runs inside auth's transaction where auth.uid() is NULL. The audit trigger on
-- organization_members called log_organization_audit(actor_user_id := auth.uid()), which
-- violated organization_audit_log.actor_user_id NOT NULL. Use the affected member as fallback.

create or replace function public.log_organization_audit(
  p_organization_id uuid,
  p_action text,
  p_target_user_id uuid,
  p_detail jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_actor uuid;
begin
  v_actor := coalesce(auth.uid(), p_target_user_id);
  if v_actor is null then
    raise exception 'log_organization_audit: actor and target user are both null';
  end if;
  insert into public.organization_audit_log (organization_id, actor_user_id, action, target_user_id, detail)
  values (p_organization_id, v_actor, p_action, p_target_user_id, p_detail);
end;
$fn$;
