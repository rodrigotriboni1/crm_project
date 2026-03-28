-- CPF/CNPJ do negócio (cartão/orçamento), separado do cadastro de cliente
alter table public.orcamentos
  add column if not exists tax_id text;

comment on column public.orcamentos.tax_id is 'CPF ou CNPJ associado a este orçamento (cartão de oportunidade).';
