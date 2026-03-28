-- Documento do cliente (CPF/CNPJ) para deduplicação e enriquecimento via BrasilAPI (CNPJ)

alter table public.clientes
  add column if not exists tax_id text;

comment on column public.clientes.tax_id is 'CPF ou CNPJ (apenas dígitos, normalizado pela app). CNPJ pode ser enriquecido via BrasilAPI.';

create unique index if not exists clientes_user_id_tax_id_unique
  on public.clientes (user_id, tax_id)
  where tax_id is not null and btrim(tax_id) <> '';
