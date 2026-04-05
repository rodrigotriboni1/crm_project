import type { OrcamentoRow } from '@/api/crm'

/** Valor de `SelectNative` para filtrar oportunidades sem categoria de produto. */
export const KANBAN_SEM_CATEGORIA_VALUE = '__sem_categoria__'

export type KanbanFollowUpFilter =
  | 'any'
  | 'none'
  | 'overdue'
  | 'today'
  | 'next7'
  | 'next30'

export type KanbanProdutoOrigemFilter = 'todos' | 'catalogo' | 'personalizado'

export type KanbanAdvancedFilters = {
  valorMin: string
  valorMax: string
  dataOrcDe: string
  dataOrcAte: string
  followUp: KanbanFollowUpFilter
  produtoOrigem: KanbanProdutoOrigemFilter
  categoria: string
  lostReasonContains: string
}

export const defaultKanbanAdvancedFilters = (): KanbanAdvancedFilters => ({
  valorMin: '',
  valorMax: '',
  dataOrcDe: '',
  dataOrcAte: '',
  followUp: 'any',
  produtoOrigem: 'todos',
  categoria: '',
  lostReasonContains: '',
})

function addDaysIso(iso: string, days: number): string {
  const [y, mo, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, mo - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

function parseValorFilter(s: string): number | null {
  const t = s.trim()
  if (!t) return null
  const n = Number(t.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function categoriaKey(o: OrcamentoRow): string {
  const c = o.produtos?.categoria?.trim()
  return c ?? ''
}

/**
 * Categorias distintas presentes nos dados (para o filtro do Kanban).
 */
export function collectKanbanCategoriaOptions(rows: OrcamentoRow[]): string[] {
  const set = new Set<string>()
  for (const o of rows) {
    const c = categoriaKey(o)
    if (c) set.add(c)
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

/**
 * Conta filtros avançados activos (exclui texto de busca global).
 */
export function countActiveKanbanAdvancedFilters(f: KanbanAdvancedFilters): number {
  let n = 0
  if (f.valorMin.trim()) n++
  if (f.valorMax.trim()) n++
  if (f.dataOrcDe.trim()) n++
  if (f.dataOrcAte.trim()) n++
  if (f.followUp !== 'any') n++
  if (f.produtoOrigem !== 'todos') n++
  if (f.categoria.trim()) n++
  if (f.lostReasonContains.trim()) n++
  return n
}

/**
 * Filtros estruturados sobre campos do orçamento e joins (`clientes`, `produtos`).
 * Combina-se com `filterOrcamentosByQuery` (texto livre).
 */
export function applyKanbanAdvancedFilters(
  rows: OrcamentoRow[],
  f: KanbanAdvancedFilters,
  todayIso: string
): OrcamentoRow[] {
  let out = rows

  const vmin = parseValorFilter(f.valorMin)
  if (vmin !== null) out = out.filter((o) => Number(o.valor) >= vmin)

  const vmax = parseValorFilter(f.valorMax)
  if (vmax !== null) out = out.filter((o) => Number(o.valor) <= vmax)

  const de = f.dataOrcDe.trim()
  if (de) out = out.filter((o) => o.data_orcamento >= de)

  const ate = f.dataOrcAte.trim()
  if (ate) out = out.filter((o) => o.data_orcamento <= ate)

  switch (f.followUp) {
    case 'none':
      out = out.filter((o) => !o.follow_up_at?.trim())
      break
    case 'overdue':
      out = out.filter((o) => {
        const fu = o.follow_up_at?.trim()
        return Boolean(fu && fu < todayIso)
      })
      break
    case 'today':
      out = out.filter((o) => o.follow_up_at?.trim() === todayIso)
      break
    case 'next7': {
      const end = addDaysIso(todayIso, 7)
      out = out.filter((o) => {
        const fu = o.follow_up_at?.trim()
        return Boolean(fu && fu >= todayIso && fu <= end)
      })
      break
    }
    case 'next30': {
      const end = addDaysIso(todayIso, 30)
      out = out.filter((o) => {
        const fu = o.follow_up_at?.trim()
        return Boolean(fu && fu >= todayIso && fu <= end)
      })
      break
    }
    default:
      break
  }

  if (f.produtoOrigem === 'catalogo') {
    out = out.filter((o) => o.produto_id != null && o.produto_id !== '')
  } else if (f.produtoOrigem === 'personalizado') {
    out = out.filter((o) => o.produto_id == null || o.produto_id === '')
  }

  const cat = f.categoria.trim()
  if (cat === KANBAN_SEM_CATEGORIA_VALUE) {
    out = out.filter((o) => !categoriaKey(o))
  } else if (cat) {
    out = out.filter((o) => categoriaKey(o) === cat)
  }

  const lost = f.lostReasonContains.trim().toLowerCase()
  if (lost) {
    out = out.filter((o) => (o.lost_reason ?? '').toLowerCase().includes(lost))
  }

  return out
}
