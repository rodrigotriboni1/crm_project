/** Dados públicos CNPJ (BrasilAPI) — persistidos em `clientes.document_enrichment`. */
export type ClienteDocumentEnrichmentCnpj = {
  kind: 'cnpj'
  source: 'brasil_api'
  fetched_at: string
  cnpj: string
  razao_social: string
  nome_fantasia?: string | null
  nome_exibicao_sugerido: string
  situacao_cadastral?: string | null
  capital_social?: number | null
  natureza_juridica?: string | null
  email?: string | null
  telefone_principal_digits?: string
  endereco: {
    logradouro?: string
    numero?: string
    complemento?: string | null
    bairro?: string
    municipio?: string
    uf?: string
    cep?: string | null
  }
  cnae_principal?: { codigo: number; descricao: string }
}

/**
 * CPF detectado — placeholder até integração futura (mesma coluna JSONB).
 * A app pode preencher `kind: 'cpf'` + `source: 'api_nome'` quando existir serviço.
 */
export type ClienteDocumentEnrichmentCpf = {
  kind: 'cpf'
  source: 'pending'
}

export type ClienteDocumentEnrichment = ClienteDocumentEnrichmentCnpj | ClienteDocumentEnrichmentCpf

export function isCnpjEnrichment(
  e: ClienteDocumentEnrichment | null | undefined
): e is ClienteDocumentEnrichmentCnpj {
  return e?.kind === 'cnpj'
}

export function isCpfEnrichment(
  e: ClienteDocumentEnrichment | null | undefined
): e is ClienteDocumentEnrichmentCpf {
  return e?.kind === 'cpf'
}
