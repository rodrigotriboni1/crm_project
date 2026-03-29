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
