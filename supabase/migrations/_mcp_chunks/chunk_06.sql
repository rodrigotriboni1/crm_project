create table if not exists public.organization_audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  actor_user_id uuid not null references auth.users (id) on delete set null,
  action text not null,
  target_user_id uuid references auth.users (id) on delete set null,
  detail jsonb,
  created_at timestamptz not null default now()
);
create index if not exists organization_audit_log_org_idx on public.organization_audit_log (organization_id, created_at desc);
alter table public.organization_audit_log enable row level security;
create policy "organization_audit_select_member" on public.organization_audit_log for select
  using (organization_id in (select public.current_user_organization_ids()));
