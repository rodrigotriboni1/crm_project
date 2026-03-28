-- EmbalaFlow CRM — initial schema + RLS (run in Supabase SQL editor or supabase db push)

-- Profiles mirror auth.users (optional display name)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Clientes
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nome text not null,
  tipo text,
  whatsapp text,
  telefone text,
  produtos_habituais text,
  observacoes text,
  follow_up_at date,
  status text not null default 'ativo'
    check (status in ('ativo', 'aguardando_follow_up', 'dormindo')),
  cor text,
  iniciais text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clientes_user_id_idx on public.clientes (user_id);
create index if not exists clientes_follow_up_idx on public.clientes (user_id, follow_up_at);

alter table public.clientes enable row level security;

create policy "clientes_all_own"
  on public.clientes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Orçamentos
create table if not exists public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  produto_descricao text not null default '',
  valor numeric(14, 2) not null default 0,
  status text not null default 'em_aberto'
    check (status in ('em_aberto', 'negociacao', 'ganho', 'perdido')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orcamentos_user_id_idx on public.orcamentos (user_id);
create index if not exists orcamentos_cliente_id_idx on public.orcamentos (cliente_id);

alter table public.orcamentos enable row level security;

create policy "orcamentos_all_own"
  on public.orcamentos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Interações (histórico de contatos)
create table if not exists public.interacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  canal text not null default 'outro',
  anotacao text not null default '',
  data_contato timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists interacoes_cliente_idx on public.interacoes (cliente_id, data_contato desc);
create index if not exists interacoes_user_id_idx on public.interacoes (user_id);

alter table public.interacoes enable row level security;

create policy "interacoes_all_own"
  on public.interacoes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists clientes_updated_at on public.clientes;
create trigger clientes_updated_at
  before update on public.clientes
  for each row execute function public.set_updated_at();

drop trigger if exists orcamentos_updated_at on public.orcamentos;
create trigger orcamentos_updated_at
  before update on public.orcamentos
  for each row execute function public.set_updated_at();
