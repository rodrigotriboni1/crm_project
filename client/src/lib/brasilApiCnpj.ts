import type { ClienteDocumentEnrichmentCnpj } from '@/types/clienteDocumentEnrichment'

/**
 * Consulta pública de CNPJ via BrasilAPI (sem chave).
 * @see https://brasilapi.com.br/docs#tag/CNPJ
 */
const BRASIL_API_CNPJ = 'https://brasilapi.com.br/api/cnpj/v1'

export type BrasilApiCnpjResponse = {
  cnpj: string
  razao_social: string
  nome_fantasia?: string | null
  situacao_cadastral?: number
  descricao_situacao_cadastral?: string
  capital_social?: number
  natureza_juridica?: string
  logradouro?: string
  numero?: string
  complemento?: string | null
  bairro?: string
  municipio?: string
  uf?: string
  cep?: string
  email?: string | null
  ddd_telefone_1?: string | null
  ddd_telefone_2?: string | null
  cnae_fiscal?: number
  cnae_fiscal_descricao?: string
}

export type CnpjEnrichmentDraft = {
  nome: string
  telefoneDigits: string
  observacoesExtra: string
}

function digitsOnly(s: string): string {
  return s.replace(/\D/g, '')
}

/** Extrai telefone principal (campo costuma vir já com DDD + número). */
export function phoneDigitsFromBrasilApi(d: BrasilApiCnpjResponse): string {
  const a = digitsOnly(d.ddd_telefone_1 ?? '')
  if (a.length >= 10) return a
  const b = digitsOnly(d.ddd_telefone_2 ?? '')
  return b.length >= 10 ? b : a || b
}

/** Monta bloco de observações com dados cadastrais públicos (complementa obs existente). */
export function buildObservacoesFromCnpj(d: BrasilApiCnpjResponse): string {
  const lines: string[] = ['— Dados públicos (BrasilAPI / CNPJ) —']
  if (d.descricao_situacao_cadastral) {
    lines.push(`Situação: ${d.descricao_situacao_cadastral}`)
  }
  lines.push(`Razão social: ${d.razao_social}`)
  const parts = [
    d.logradouro,
    d.numero,
    d.complemento,
    d.bairro,
    d.municipio && d.uf ? `${d.municipio}/${d.uf}` : d.municipio || d.uf,
    d.cep ? `CEP ${digitsOnly(d.cep)}` : '',
  ].filter(Boolean)
  if (parts.length) lines.push(`Endereço: ${parts.join(', ')}`)
  if (d.email) lines.push(`E-mail: ${d.email}`)
  if (d.cnae_fiscal && d.cnae_fiscal_descricao) {
    lines.push(`CNAE: ${d.cnae_fiscal} — ${d.cnae_fiscal_descricao}`)
  }
  return lines.join('\n')
}

/** Nome de exibição: fantasia se houver, senão razão social. */
export function displayNameFromCnpj(d: BrasilApiCnpjResponse): string {
  const f = (d.nome_fantasia ?? '').trim()
  if (f) return f
  return (d.razao_social ?? '').trim()
}

export function mapBrasilApiCnpjToDraft(d: BrasilApiCnpjResponse): CnpjEnrichmentDraft {
  return {
    nome: displayNameFromCnpj(d),
    telefoneDigits: phoneDigitsFromBrasilApi(d),
    observacoesExtra: buildObservacoesFromCnpj(d),
  }
}

/** Modelo persistido no CRM (separado de observações livres). */
export function toClienteDocumentEnrichment(d: BrasilApiCnpjResponse): ClienteDocumentEnrichmentCnpj {
  const cnpj = digitsOnly(d.cnpj)
  const tel = phoneDigitsFromBrasilApi(d)
  return {
    kind: 'cnpj',
    source: 'brasil_api',
    fetched_at: new Date().toISOString(),
    cnpj,
    razao_social: d.razao_social,
    nome_fantasia: d.nome_fantasia ?? null,
    nome_exibicao_sugerido: displayNameFromCnpj(d),
    situacao_cadastral: d.descricao_situacao_cadastral ?? null,
    capital_social: typeof d.capital_social === 'number' ? d.capital_social : null,
    natureza_juridica: d.natureza_juridica ?? null,
    email: d.email ?? null,
    telefone_principal_digits: tel || undefined,
    endereco: {
      logradouro: d.logradouro,
      numero: d.numero,
      complemento: d.complemento ?? null,
      bairro: d.bairro,
      municipio: d.municipio,
      uf: d.uf,
      cep: d.cep ? digitsOnly(d.cep) : null,
    },
    cnae_principal:
      d.cnae_fiscal != null
        ? { codigo: d.cnae_fiscal, descricao: d.cnae_fiscal_descricao ?? '' }
        : undefined,
  }
}

export async function fetchBrasilApiCnpj(cnpjDigits: string): Promise<BrasilApiCnpjResponse> {
  const cnpj = digitsOnly(cnpjDigits)
  if (cnpj.length !== 14) {
    throw new Error('CNPJ deve ter 14 dígitos.')
  }
  const res = await fetch(`${BRASIL_API_CNPJ}/${cnpj}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })
  if (res.status === 404) {
    throw new Error('CNPJ não encontrado na base pública.')
  }
  if (!res.ok) {
    const t = await res.text()
    throw new Error(t.slice(0, 200) || `Falha na consulta (${res.status}).`)
  }
  return (await res.json()) as BrasilApiCnpjResponse
}
