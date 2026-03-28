-- Catálogo de produtos por usuário (embalagens / itens reutilizáveis em orçamentos)

create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nome text not null,
  codigo text,
  categoria text,
  descricao text,
  unidade text not null default 'un',
  especificacoes jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists produtos_user_id_idx on public.produtos (user_id);
create index if not exists produtos_user_ativo_idx on public.produtos (user_id, ativo);

drop trigger if exists produtos_updated_at on public.produtos;
create trigger produtos_updated_at
  before update on public.produtos
  for each row execute function public.set_updated_at();

alter table public.produtos enable row level security;

create policy "produtos_all_own"
  on public.produtos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.produtos is 'Catálogo de produtos/serviços para uso em orçamentos.';
comment on column public.produtos.categoria is 'Livre: tipo ou família (ex.: Caixa, Saco, Filme).';
comment on column public.produtos.especificacoes is 'JSON extensível: material, medidas, etc.';

alter table public.orcamentos
  add column if not exists produto_id uuid references public.produtos (id) on delete set null;

create index if not exists orcamentos_produto_id_idx on public.orcamentos (produto_id);

comment on column public.orcamentos.produto_id is 'Referência opcional ao catálogo; produto_descricao permanece como texto exibido.';
