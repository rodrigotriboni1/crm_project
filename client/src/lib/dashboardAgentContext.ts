import { FOLLOW_UP_ALERT_WINDOW_DAYS, type DashboardData } from '@/api/crm'
import { finalizeAssistantSnapshotJson } from '@/lib/assistantContextEnvelope'
import { ASSISTANT_DEFAULT_MAX_NOTE, clipAssistantText } from '@/lib/assistantPii'

/**
 * Snapshot enxuto do dashboard para o assistente (sem PII além do necessário ao uso comercial do CRM).
 * Documento fiscal do cliente não é incluído; nomes comerciais sim.
 */
export function buildDashboardAgentContext(
  data: DashboardData,
  todayIso: string,
  organizationId: string | null
): string {
  const body = {
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
      anotacao: clipAssistantText(i.anotacao || '', ASSISTANT_DEFAULT_MAX_NOTE),
    })),
  }
  return finalizeAssistantSnapshotJson({ organizationId, screen: 'dashboard' }, body)
}
