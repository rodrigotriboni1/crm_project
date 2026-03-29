create table if not exists public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'inactive', 'away')),
  max_open_leads int,
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
create index if not exists team_members_user_id_idx on public.team_members (user_id);

alter table public.teams enable row level security;
alter table public.team_members enable row level security;

create policy "teams_select_member" on public.teams for select
  using (organization_id in (select public.current_user_organization_ids()));
create policy "teams_insert_owner" on public.teams for insert with check (
  organization_id in (select public.current_user_organization_ids())
  and exists (select 1 from public.organization_members m where m.organization_id = organization_id
    and m.user_id = (select auth.uid()) and m.role = 'owner'));
create policy "teams_update_owner" on public.teams for update using (
  organization_id in (select public.current_user_organization_ids())
  and exists (select 1 from public.organization_members m where m.organization_id = teams.organization_id
    and m.user_id = (select auth.uid()) and m.role = 'owner'));
create policy "teams_delete_owner" on public.teams for delete using (
  organization_id in (select public.current_user_organization_ids())
  and exists (select 1 from public.organization_members m where m.organization_id = teams.organization_id
    and m.user_id = (select auth.uid()) and m.role = 'owner'));

create policy "team_members_select" on public.team_members for select using (
  exists (select 1 from public.teams t where t.id = team_members.team_id
    and t.organization_id in (select public.current_user_organization_ids())));
create policy "team_members_insert_owner" on public.team_members for insert with check (
  exists (select 1 from public.teams t where t.id = team_members.team_id
    and t.organization_id in (select public.current_user_organization_ids())
    and exists (select 1 from public.organization_members m where m.organization_id = t.organization_id
      and m.user_id = (select auth.uid()) and m.role = 'owner'))
  and exists (select 1 from public.organization_members m2
    where m2.organization_id = (select t2.organization_id from public.teams t2 where t2.id = team_members.team_id)
      and m2.user_id = team_members.user_id));
create policy "team_members_update_owner" on public.team_members for update using (
  exists (select 1 from public.teams t where t.id = team_members.team_id
    and t.organization_id in (select public.current_user_organization_ids())
    and exists (select 1 from public.organization_members m where m.organization_id = t.organization_id
      and m.user_id = (select auth.uid()) and m.role = 'owner')));
create policy "team_members_delete_owner" on public.team_members for delete using (
  exists (select 1 from public.teams t where t.id = team_members.team_id
    and t.organization_id in (select public.current_user_organization_ids())
    and exists (select 1 from public.organization_members m where m.organization_id = t.organization_id
      and m.user_id = (select auth.uid()) and m.role = 'owner')));
