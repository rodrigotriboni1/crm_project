import type { Produto } from '@/types/database'
import { finalizeAssistantSnapshotJson } from '@/lib/assistantContextEnvelope'
import { clipAssistantText } from '@/lib/assistantPii'

const MAX_SAMPLE = 35

export function buildProdutosAgentContext(
  organizationId: string | null,
  args: {
    viewMode: 'list' | 'table'
    groupByCategory: boolean
    busca: string
    totalVisivel: number
    amostra: Produto[]
  }
): string {
  const sample = args.amostra.slice(0, MAX_SAMPLE)
  const amostraTruncada = args.totalVisivel > MAX_SAMPLE
  const body = {
    vista: args.viewMode,
    porCategoria: args.groupByCategory,
    busca: args.busca.trim() || null,
    totalVisivel: args.totalVisivel,
    produtosAmostra: sample.map((p) => ({
      id: p.id,
      nome: p.nome,
      categoria: p.categoria,
      codigo: p.codigo,
      ativo: p.ativo,
      descricao: p.descricao ? clipAssistantText(p.descricao, 160) : null,
    })),
    amostraTruncada,
  }
  return finalizeAssistantSnapshotJson(
    {
      organizationId,
      screen: 'produtos',
      truncated: amostraTruncada,
      truncamentoNotas: amostraTruncada
        ? `Catálogo visível: ${MAX_SAMPLE} produtos no JSON de ${args.totalVisivel} após filtros.`
        : undefined,
    },
    body
  )
}
