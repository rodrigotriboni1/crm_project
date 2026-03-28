import type { ReportsData } from '@/api/reports'

const MAX_ORCAMENTOS_SNAPSHOT = 50

/**
 * Snapshot enxuto de relatórios para o assistente (alinhado ao contrato de fetchReportsData).
 */
export function buildReportsAgentContext(data: ReportsData): string {
  const payload = {
    geradoEm: new Date().toISOString(),
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
    orcamentosAmostraTruncada: data.orcamentosResumo.length > MAX_ORCAMENTOS_SNAPSHOT,
  }
  return JSON.stringify(payload, null, 2)
}
