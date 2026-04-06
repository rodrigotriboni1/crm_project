import type { ReportsData } from '@/api/reports'
import { finalizeAssistantSnapshotJson } from '@/lib/assistantContextEnvelope'

const MAX_ORCAMENTOS_SNAPSHOT = 50

/**
 * Snapshot enxuto de relatórios para o assistente (alinhado ao contrato de fetchReportsData).
 */
export function buildReportsAgentContext(data: ReportsData, organizationId: string | null): string {
  const amostraTruncada = data.orcamentosResumo.length > MAX_ORCAMENTOS_SNAPSHOT
  const body = {
    periodo: data.range,
    notas: {
      orcamentos:
        'Apenas orçamentos com data_orcamento entre periodo.start e periodo.end (inclusive).',
      emAberto: 'Soma e contagens "em aberto" = status novo_contato ou orcamento_enviado (igual ao dashboard).',
      interacoes: 'Contadas por data_contato no mesmo intervalo de calendário (UTC dia cheio).',
    },
    totais: {
      totalOrcamentosNoPeriodo: data.totalOrcamentosNoPeriodo,
      valorEmAbertoNoPeriodo: data.valorEmAbertoNoPeriodo,
      valorGanhoNoPeriodo: data.valorGanhoNoPeriodo,
    },
    porStatus: data.porStatus,
    seriePorDia: data.seriePorDia,
    topClientes: data.topClientes,
    interacoesPorCanal: data.interacoesPorCanal,
    orcamentosAmostra: data.orcamentosResumo.slice(0, MAX_ORCAMENTOS_SNAPSHOT),
    orcamentosAmostraTruncada: amostraTruncada,
    orcamentosResumoTotalLinhas: data.orcamentosResumo.length,
  }
  const truncated = Boolean(data.orcamentosResumoTruncated) || amostraTruncada
  const notas: string[] = []
  if (data.orcamentosResumoTruncated) {
    notas.push('A lista completa de orçamentos do período foi truncada no servidor ao gerar o relatório.')
  }
  if (amostraTruncada) {
    notas.push(
      `Amostra no JSON limitada a ${MAX_ORCAMENTOS_SNAPSHOT} orçamentos; o período tem ${data.orcamentosResumo.length} linhas no resumo.`
    )
  }
  return finalizeAssistantSnapshotJson(
    {
      organizationId,
      screen: 'reports',
      truncated,
      truncamentoNotas: notas.join(' '),
    },
    body
  )
}
