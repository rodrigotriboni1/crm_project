import type { KanbanAdvancedFilters } from '@/lib/kanbanFilters'
import { defaultKanbanAdvancedFilters } from '@/lib/kanbanFilters'

export const KANBAN_SAVED_FILTER_VERSION = 1 as const

export type KanbanSavedFilterPayloadV1 = {
  v: typeof KANBAN_SAVED_FILTER_VERSION
  q: string
  advanced: KanbanAdvancedFilters
}

export function buildKanbanSavedFilterPayload(
  q: string,
  advanced: KanbanAdvancedFilters
): KanbanSavedFilterPayloadV1 {
  return {
    v: KANBAN_SAVED_FILTER_VERSION,
    q: q.trim(),
    advanced: { ...advanced },
  }
}

function isFollowUp(v: unknown): v is KanbanAdvancedFilters['followUp'] {
  return (
    v === 'any' ||
    v === 'none' ||
    v === 'overdue' ||
    v === 'today' ||
    v === 'next7' ||
    v === 'next30'
  )
}

function isProdutoOrigem(v: unknown): v is KanbanAdvancedFilters['produtoOrigem'] {
  return v === 'todos' || v === 'catalogo' || v === 'personalizado'
}

/**
 * Interpreta JSON guardado na BD; devolve null se for inválido.
 */
export function parseKanbanSavedFilterPayload(raw: unknown): {
  q: string
  advanced: KanbanAdvancedFilters
} | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (o.v !== KANBAN_SAVED_FILTER_VERSION) return null
  const q = typeof o.q === 'string' ? o.q : ''
  const advIn = o.advanced
  if (!advIn || typeof advIn !== 'object') return null
  const a = advIn as Record<string, unknown>
  const base = defaultKanbanAdvancedFilters()
  const advanced: KanbanAdvancedFilters = {
    valorMin: typeof a.valorMin === 'string' ? a.valorMin : base.valorMin,
    valorMax: typeof a.valorMax === 'string' ? a.valorMax : base.valorMax,
    dataOrcDe: typeof a.dataOrcDe === 'string' ? a.dataOrcDe : base.dataOrcDe,
    dataOrcAte: typeof a.dataOrcAte === 'string' ? a.dataOrcAte : base.dataOrcAte,
    followUp: isFollowUp(a.followUp) ? a.followUp : base.followUp,
    produtoOrigem: isProdutoOrigem(a.produtoOrigem) ? a.produtoOrigem : base.produtoOrigem,
    categoria: typeof a.categoria === 'string' ? a.categoria : base.categoria,
    lostReasonContains:
      typeof a.lostReasonContains === 'string' ? a.lostReasonContains : base.lostReasonContains,
  }
  return { q, advanced }
}
