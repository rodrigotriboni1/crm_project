import { digitsOnly, formatCpfCnpj, formatFieldValueForDisplay } from '@/lib/formatters'
import { clienteListPhoneDisplayField } from '@/lib/fields/clienteFormFields'
import type { ClienteListItem, ClienteUpdate } from '@/types/database'

export type ClienteTipoFilter = 'todos' | 'novo' | 'recompra'
export type ClientePhoneFilter = 'todos' | 'com' | 'sem'
export type ClienteSort = 'nome_asc' | 'ultimo_desc' | 'criado_desc'
/** Filtro de ficha: ativos (default em listagem), arquivados ou todos. */
export type ClienteArchiveFilter = 'ativos' | 'arquivados' | 'todos'

export function clienteEstaAtivo(c: ClienteListItem): boolean {
  return c.ativo !== false
}

const MS_DAY = 86_400_000

export function clienteHasPhone(c: ClienteListItem): boolean {
  const w = c.whatsapp ? digitsOnly(c.whatsapp) : ''
  const t = c.telefone ? digitsOnly(c.telefone) : ''
  return Boolean(w.length >= 8 || t.length >= 8)
}

/** Texto curto para linha da lista (WhatsApp preferido, senão telefone). */
export function clientePhoneLine(c: ClienteListItem): string {
  if (c.whatsapp && digitsOnly(c.whatsapp).length >= 8) {
    return formatFieldValueForDisplay(clienteListPhoneDisplayField, c.whatsapp)
  }
  if (c.telefone && digitsOnly(c.telefone).length >= 8) {
    return formatFieldValueForDisplay(clienteListPhoneDisplayField, c.telefone)
  }
  return 'Sem telefone'
}

export function clienteTaxDisplay(c: ClienteListItem): string | null {
  const d = c.tax_id ? digitsOnly(c.tax_id) : ''
  if (d.length !== 11 && d.length !== 14) return null
  return formatCpfCnpj(d)
}

export function formatUltimoContatoLabel(iso: string | null | undefined): string {
  if (!iso) return 'Sem contacto registado'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Sem contacto registado'
  const now = Date.now()
  const diff = now - d.getTime()
  const days = Math.floor(diff / MS_DAY)
  if (days < 0) return 'Contacto recente'
  if (days === 0) return 'Último: hoje'
  if (days === 1) return 'Último: ontem'
  if (days < 7) return `Último: há ${days} dias`
  if (days < 30) return `Último: há ${Math.floor(days / 7)} sem.`
  return `Último: ${d.toLocaleDateString('pt-BR')}`
}

export function isSemContactoLongo(iso: string | null | undefined, dias: number): boolean {
  if (!iso) return true
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return true
  return Date.now() - d.getTime() > dias * MS_DAY
}

export function clienteMatchesSearch(c: ClienteListItem, qRaw: string): boolean {
  const s = qRaw.trim().toLowerCase()
  if (!s) return true
  const qDigits = digitsOnly(qRaw)
  if (c.nome.toLowerCase().includes(s)) return true
  if (c.produtos_habituais && c.produtos_habituais.toLowerCase().includes(s)) return true
  const taxDigits = c.tax_id ? digitsOnly(c.tax_id) : ''
  if (taxDigits && qDigits.length >= 3 && taxDigits.includes(qDigits)) return true
  const w = c.whatsapp ? digitsOnly(c.whatsapp) : ''
  const t = c.telefone ? digitsOnly(c.telefone) : ''
  if (qDigits.length >= 4 && (w.includes(qDigits) || t.includes(qDigits))) return true
  return false
}

export function filterAndSortClientes(
  list: ClienteListItem[],
  opts: {
    q: string
    tipo: ClienteTipoFilter
    phone: ClientePhoneFilter
    sort: ClienteSort
    archive: ClienteArchiveFilter
  }
): ClienteListItem[] {
  let out = list.filter((c) => clienteMatchesSearch(c, opts.q))
  if (opts.archive === 'ativos') {
    out = out.filter((c) => clienteEstaAtivo(c))
  } else if (opts.archive === 'arquivados') {
    out = out.filter((c) => !clienteEstaAtivo(c))
  }
  if (opts.tipo !== 'todos') {
    out = out.filter((c) => c.tipo === opts.tipo)
  }
  if (opts.phone === 'com') {
    out = out.filter((c) => clienteHasPhone(c))
  } else if (opts.phone === 'sem') {
    out = out.filter((c) => !clienteHasPhone(c))
  }
  const sorted = [...out]
  if (opts.sort === 'nome_asc') {
    sorted.sort((a, b) => a.nome.localeCompare(b.nome, 'pt', { sensitivity: 'base' }))
  } else if (opts.sort === 'criado_desc') {
    sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  } else {
    sorted.sort((a, b) => {
      const ta = a.ultimo_contato ? new Date(a.ultimo_contato).getTime() : 0
      const tb = b.ultimo_contato ? new Date(b.ultimo_contato).getTime() : 0
      if (ta === tb) return a.nome.localeCompare(b.nome, 'pt', { sensitivity: 'base' })
      return tb - ta
    })
  }
  return sorted
}

export function clientesListKpis(list: ClienteListItem[]) {
  const ativos = list.filter((c) => clienteEstaAtivo(c))
  const arquivados = list.length - ativos.length
  const recomprasAtivos = ativos.filter((c) => c.tipo === 'recompra').length
  const comTel = ativos.filter((c) => clienteHasPhone(c)).length
  const semContato30 = ativos.filter((c) => isSemContactoLongo(c.ultimo_contato, 30)).length
  const nAtivos = ativos.length
  const pctTel = nAtivos ? Math.round((comTel / nAtivos) * 100) : 0
  return {
    ativos: nAtivos,
    arquivados,
    recompras: recomprasAtivos,
    comTel,
    semContato30,
    pctTel,
  }
}

/** Patches `{ ativo }` só para fichas cuja seleção precisa mesmo mudar de estado. */
export function clientesBulkAtivoPatches(
  selectedIds: ReadonlySet<string>,
  all: ClienteListItem[],
  ativo: boolean
): { id: string; patch: ClienteUpdate }[] {
  const byId = new Map(all.map((row) => [row.id, row] as const))
  const out: { id: string; patch: ClienteUpdate }[] = []
  for (const id of selectedIds) {
    const row = byId.get(id)
    if (row != null && row.ativo !== ativo) {
      out.push({ id, patch: { ativo } })
    }
  }
  return out
}
