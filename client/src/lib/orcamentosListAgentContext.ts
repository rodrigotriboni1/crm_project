import type { OrcamentoRow } from '@/api/crm'
import { finalizeAssistantSnapshotJson } from '@/lib/assistantContextEnvelope'
import { clipAssistantText } from '@/lib/assistantPii'
import type { OrcamentoStatus } from '@/types/database'

const MAX_SAMPLE = 40

export function buildOrcamentosListAgentContext(
  organizationId: string | null,
  args: {
    filtroStatus: 'todos' | OrcamentoStatus
    busca: string
    totalCarregados: number
    linhasVisiveis: OrcamentoRow[]
  }
): string {
  const n = args.linhasVisiveis.length
  const sample = args.linhasVisiveis.slice(0, MAX_SAMPLE)
  const amostraTruncada = n > MAX_SAMPLE
  const body = {
    filtroStatus: args.filtroStatus,
    busca: args.busca.trim() || null,
    totalCarregadosNaLista: args.totalCarregados,
    linhasAposBuscaEStatus: n,
    notaPrivacidade:
      'Identificadores fiscais do cartão de oportunidade não são incluídos no snapshot da lista.',
    orcamentosAmostra: sample.map((o) => ({
      id: o.id,
      display_num: o.display_num,
      clienteNome: o.clientes?.nome ?? null,
      status: o.status,
      valor: o.valor,
      dataOrcamento: o.data_orcamento,
      produto: clipAssistantText(o.produto_descricao, 100),
    })),
    amostraTruncada,
  }
  return finalizeAssistantSnapshotJson(
    {
      organizationId,
      screen: 'orcamentos_list',
      truncated: amostraTruncada,
      truncamentoNotas: amostraTruncada
        ? `Amostra de ${MAX_SAMPLE} orçamentos de ${n} visíveis (filtro + busca). A lista paginada pode ter mais páginas.`
        : undefined,
    },
    body
  )
}
