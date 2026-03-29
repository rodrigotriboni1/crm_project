-- assigned_user_id is NOT NULL; FK must not use ON DELETE SET NULL (would fail on user delete)
alter table public.clientes drop constraint if exists clientes_assigned_user_id_fkey;

alter table public.clientes
  add constraint clientes_assigned_user_id_fkey
  foreign key (assigned_user_id) references auth.users (id) on delete restrict;
