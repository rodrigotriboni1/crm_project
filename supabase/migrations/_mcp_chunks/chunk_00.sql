-- Column may already exist from 20260428119999_organization_members_data_scope.sql
alter table public.organization_members
  add column if not exists data_scope text
    not null
    default 'organization'
    constraint organization_members_data_scope_check
    check (data_scope in ('organization', 'own'));

alter table public.clientes
  add column if not exists assigned_user_id uuid references auth.users (id) on delete set null;

update public.clientes set assigned_user_id = user_id where assigned_user_id is null;
alter table public.clientes alter column assigned_user_id set not null;

create index if not exists clientes_org_assigned_user_idx
  on public.clientes (organization_id, assigned_user_id);
