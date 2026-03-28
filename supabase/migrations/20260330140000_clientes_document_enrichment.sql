-- Snapshot estruturado de consulta CNPJ (BrasilAPI) ou placeholder CPF (integração futura)

alter table public.clientes
  add column if not exists document_enrichment jsonb;

comment on column public.clientes.document_enrichment is 'JSON: enriquecimento por documento (CNPJ BrasilAPI, CPF pending/futuro).';
