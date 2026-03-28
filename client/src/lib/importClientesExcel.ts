import * as XLSX from 'xlsx'
import { digitsOnly } from '@/lib/formatters'
import { normalizeClienteTaxId } from '@/lib/taxId'
import type { ClienteTipo } from '@/types/database'

export type ClienteImportField =
  | 'nome'
  | 'tax_id'
  | 'whatsapp'
  | 'telefone'
  | 'tipo'
  | 'produtos_habituais'
  | 'observacoes'
  | ''

const TARGET_OPTIONS: { value: ClienteImportField; label: string }[] = [
  { value: '', label: '— ignorar —' },
  { value: 'nome', label: 'Nome / razão social' },
  { value: 'tax_id', label: 'CPF / CNPJ' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'tipo', label: 'Tipo (novo / recompra)' },
  { value: 'produtos_habituais', label: 'Produtos habituais' },
  { value: 'observacoes', label: 'Observações' },
]

export function importTargetOptions() {
  return TARGET_OPTIONS
}

export type ParsedSheet = {
  sheetName: string
  headers: string[]
  rows: string[][]
}

export async function parseExcelFile(file: File): Promise<ParsedSheet[]> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const out: ParsedSheet[] = []
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    if (!ws) continue
    const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' }) as string[][]
    if (!data.length) continue
    const headers = (data[0] ?? []).map((c) => String(c ?? '').trim())
    const rows = data.slice(1).map((row) => row.map((c) => String(c ?? '').trim()))
    out.push({ sheetName, headers, rows })
  }
  return out.length ? out : []
}

/** Primeiras N linhas não vazias (para amostra / preview). */
export function nonEmptySampleRows(rows: string[][], headersLen: number, max: number): string[][] {
  const out: string[][] = []
  for (const row of rows) {
    if (out.length >= max) break
    const cells = [...row]
    while (cells.length < headersLen) cells.push('')
    const slice = cells.slice(0, headersLen)
    if (slice.some((c) => c.trim() !== '')) out.push(slice)
  }
  return out
}

export type ColumnMapping = Record<string, ClienteImportField>

function normalizeTipo(raw: string): ClienteTipo {
  const s = raw.trim().toLowerCase()
  if (s.includes('recompra') || s.includes('recorrente') || s === 'r' || s === '2') return 'recompra'
  return 'novo'
}

export function rowToClientePayload(
  row: string[],
  headers: string[],
  mapping: ColumnMapping
): {
  nome: string
  tax_id?: string | null
  whatsapp?: string
  telefone?: string
  tipo?: ClienteTipo
  produtos_habituais?: string
  observacoes?: string
} | null {
  const byField: Partial<Record<ClienteImportField, string>> = {}
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i]
    const field = mapping[h]
    if (!field) continue
    const val = row[i] ?? ''
    byField[field] = val
  }
  const nome = (byField.nome ?? '').trim()
  if (!nome) return null
  const taxRaw = byField.tax_id?.trim()
  const tax_id = taxRaw ? normalizeClienteTaxId(taxRaw) : null
  const whatsapp = byField.whatsapp?.trim() ? digitsOnly(byField.whatsapp) : undefined
  const telefone = byField.telefone?.trim() ? digitsOnly(byField.telefone) : undefined
  const tipo = byField.tipo ? normalizeTipo(byField.tipo) : 'novo'
  const produtos_habituais = byField.produtos_habituais?.trim() || undefined
  const observacoes = byField.observacoes?.trim() || undefined
  return {
    nome,
    tax_id: tax_id ?? undefined,
    whatsapp: whatsapp || undefined,
    telefone: telefone || undefined,
    tipo,
    produtos_habituais,
    observacoes,
  }
}

export function buildMappingFromAi(
  headers: string[],
  aiMapping: Record<string, string> | null | undefined
): ColumnMapping {
  const allowed = new Set(TARGET_OPTIONS.map((o) => o.value).filter(Boolean))
  const out: ColumnMapping = {}
  for (const h of headers) {
    out[h] = ''
  }
  if (!aiMapping) return out
  for (const [col, target] of Object.entries(aiMapping)) {
    const key = headers.find((x) => x === col) ?? headers.find((x) => x.trim() === col.trim())
    if (!key) continue
    const t = String(target).trim() as ClienteImportField
    if (allowed.has(t)) out[key] = t
  }
  return out
}
