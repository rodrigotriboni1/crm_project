-- Ensures organization_members.data_scope for OrganizationContext and RPCs.
-- Runs before 20260428120000_team_equipe_redesign.sql so the column exists even if that migration fails partway.
-- Idempotent.

alter table public.organization_members
  add column if not exists data_scope text;

update public.organization_members
set data_scope = 'organization'
where data_scope is null;

alter table public.organization_members
  alter column data_scope set default 'organization';

alter table public.organization_members
  alter column data_scope set not null;

do $do$
begin
  alter table public.organization_members
    add constraint organization_members_data_scope_check
    check (data_scope in ('organization', 'own'));
exception
  when duplicate_object then null;
end
$do$;
