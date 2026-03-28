import { FOLLOW_UP_ALERT_WINDOW_DAYS, type DashboardData } from '@/api/crm'

const MAX_NOTE = 280

function clip(s: string, max: number) {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

/**
 * Snapshot enxuto do dashboard para o assistente (sem PII além do necessário ao uso comercial do CRM).
 */
export function buildDashboardAgentContext(data: DashboardData, todayIso: string): string {
  const payload = {
    geradoEm: new Date().toISOString(),
    hoje: todayIso,
    janelaFollowUpDias: FOLLOW_UP_ALERT_WINDOW_DAYS,
    metricas: {
      totalClientes: data.totalClientes,
      orcamentosEmAberto: data.orcamentosEmAberto,
      valorPipelineAberto: data.valorPipelineAberto,
      orcamentosDormindo: data.orcamentosDormindo,
      clientesNovosMes: data.clientesNovosMes,
      orcamentosGanhosMes: data.orcamentosGanhosMes,
    },
    filaFollowUp: data.alertasFollowUp.map((o) => ({
      orcamentoId: o.id,
      clienteId: o.cliente_id,
      clienteNome: o.clientes?.nome ?? null,
      status: o.status,
      produto: o.produto_descricao,
      valor: o.valor,
      followUpEm: o.follow_up_at,
    })),
    ultimasInteracoes: data.ultimas5.map((i) => ({
      clienteId: i.cliente_id,
      clienteNome: i.clientes?.nome ?? null,
      canal: i.canal,
      dataContato: i.data_contato,
      anotacao: clip(i.anotacao || '', MAX_NOTE),
    })),
  }
  return JSON.stringify(payload, null, 2)
}
