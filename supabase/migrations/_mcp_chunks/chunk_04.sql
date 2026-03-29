create or replace function public.list_organization_members(p_organization_id uuid)
returns jsonb language plpgsql security definer set search_path = public, auth as $fn$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.organization_members m where m.organization_id = p_organization_id and m.user_id = v_uid) then
    raise exception 'forbidden';
  end if;
  return coalesce((select jsonb_agg(x.row_data order by x.sort_role, x.sort_email) from (
    select jsonb_build_object('user_id', m.user_id, 'email', u.email::text, 'full_name', p.full_name, 'role', m.role, 'data_scope', m.data_scope) as row_data,
      case when m.role = 'owner' then 0 else 1 end as sort_role, coalesce(u.email::text, '') as sort_email
    from public.organization_members m
    inner join auth.users u on u.id = m.user_id
    left join public.profiles p on p.id = m.user_id
    where m.organization_id = p_organization_id) x), '[]'::jsonb);
end;
$fn$;
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  leader_user_id uuid references auth.users (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists teams_organization_id_idx on public.teams (organization_id);
