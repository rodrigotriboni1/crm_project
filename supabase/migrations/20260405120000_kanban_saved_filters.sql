-- Filtros do Kanban guardados por utilizador; visibilidade privada ou partilhada na organização.

create table if not exists public.kanban_saved_filters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  name text not null,
  is_shared boolean not null default false,
  filters jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kanban_saved_filters_name_trim check (length(trim(name)) > 0)
);

comment on table public.kanban_saved_filters is
  'Preset de filtros do funil Kanban: is_shared false = só o criador; true = todos os membros da organização.';
comment on column public.kanban_saved_filters.is_shared is
  'true = visível para toda a organização; false = privado ao utilizador que criou.';

create index if not exists kanban_saved_filters_organization_id_idx
  on public.kanban_saved_filters (organization_id);

create index if not exists kanban_saved_filters_org_created_idx
  on public.kanban_saved_filters (organization_id, created_at desc);

alter table public.kanban_saved_filters enable row level security;

create policy kanban_saved_filters_select on public.kanban_saved_filters
  for select to authenticated
  using (
    organization_id in (select public.current_user_organization_ids())
    and (
      is_shared = true
      or created_by = (select auth.uid())
    )
  );

create policy kanban_saved_filters_insert on public.kanban_saved_filters
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and organization_id in (select public.current_user_organization_ids())
  );

create policy kanban_saved_filters_update on public.kanban_saved_filters
  for update to authenticated
  using (created_by = (select auth.uid()))
  with check (
    created_by = (select auth.uid())
    and organization_id in (select public.current_user_organization_ids())
  );

create policy kanban_saved_filters_delete on public.kanban_saved_filters
  for delete to authenticated
  using (created_by = (select auth.uid()));

grant select, insert, update, delete on public.kanban_saved_filters to authenticated;
