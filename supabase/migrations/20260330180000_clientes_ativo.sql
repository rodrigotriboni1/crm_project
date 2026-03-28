-- Cliente arquivado: oculto em seleções de orçamento; dados preservados

alter table public.clientes
  add column if not exists ativo boolean not null default true;

comment on column public.clientes.ativo is 'false = arquivado (fora das listas de novo orçamento; detalhe continua acessível).';

create index if not exists clientes_user_id_ativo_idx on public.clientes (user_id, ativo);
