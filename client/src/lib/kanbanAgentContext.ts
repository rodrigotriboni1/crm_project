import type { OrcamentoRow } from '@/api/crm'
import { KANBAN_ORCAMENTOS_MAX } from '@/api/orcamentos'
import { finalizeAssistantSnapshotJson } from '@/lib/assistantContextEnvelope'
import { ASSISTANT_DEFAULT_MAX_LOST_REASON, clipAssistantText } from '@/lib/assistantPii'
import type { KanbanAdvancedFilters } from '@/lib/kanbanFilters'
import type { KanbanGroupMode } from '@/lib/kanbanGroup'
import { ORCAMENTO_STATUS_ORDER } from '@/lib/orcamentoStatusUi'
import type { OrcamentoStatus } from '@/types/database'

const MAX_CARDS_SAMPLE = 48

function countsByStatus(rows: OrcamentoRow[]): Record<OrcamentoStatus, number> {
  const m = {} as Record<OrcamentoStatus, number>
  for (const s of ORCAMENTO_STATUS_ORDER) m[s] = 0
  for (const o of rows) {
    if (m[o.status] !== undefined) m[o.status]++
  }
  return m
}

export function buildKanbanAgentContext(
  organizationId: string | null,
  args: {
    filteredRows: OrcamentoRow[]
    q: string
    advanced: KanbanAdvancedFilters
    groupMode: KanbanGroupMode
    view: 'kanban' | 'table'
    kanbanLoadTruncated: boolean
  }
): string {
  const filteredCount = args.filteredRows.length
  const sample = args.filteredRows.slice(0, MAX_CARDS_SAMPLE)
  const cartoesAmostra = sample.map((o) => ({
    id: o.id,
    display_num: o.display_num,
    clienteNome: o.clientes?.nome ?? null,
    status: o.status,
    valor: o.valor,
    produto: clipAssistantText(o.produto_descricao, 120),
    dataOrcamento: o.data_orcamento,
    followUpAt: o.follow_up_at,
    lostReason: o.lost_reason
      ? clipAssistantText(o.lost_reason, ASSISTANT_DEFAULT_MAX_LOST_REASON)
      : null,
  }))
  const amostraCartoesTruncada = filteredCount > MAX_CARDS_SAMPLE
  const body = {
    hoje: new Date().toISOString().slice(0, 10),
    vista: args.view,
    buscaTextual: args.q.trim() || null,
    filtrosAvancados: args.advanced,
    agrupamentoColuna: args.groupMode,
    contagemPorEstado: countsByStatus(args.filteredRows),
    totalFiltradoVisivel: filteredCount,
    cargaKanbanTruncada: args.kanbanLoadTruncated,
    limiteCargaKanban: KANBAN_ORCAMENTOS_MAX,
    cartoesAmostra,
    amostraCartoesTruncada,
  }
  const truncated = args.kanbanLoadTruncated || amostraCartoesTruncada
  const notas: string[] = []
  if (args.kanbanLoadTruncated) {
    notas.push(
      `A carga inicial do Kanban está limitada aos ${KANBAN_ORCAMENTOS_MAX} orçamentos mais recentes; pode haver mais na organização.`
    )
  }
  if (amostraCartoesTruncada) {
    notas.push(
      `No JSON seguem ${MAX_CARDS_SAMPLE} cartões de ${filteredCount} visíveis com os filtros actuais.`
    )
  }
  return finalizeAssistantSnapshotJson(
    {
      organizationId,
      screen: 'kanban',
      truncated,
      truncamentoNotas: notas.join(' '),
    },
    body
  )
}
