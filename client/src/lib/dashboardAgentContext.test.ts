import { describe, expect, it, vi } from 'vitest'
import { buildDashboardAgentContext } from '@/lib/dashboardAgentContext'
import type { DashboardData } from '@/api/crm'

const emptyDashboard = (): DashboardData => ({
  totalClientes: 0,
  orcamentosEmAberto: 0,
  orcamentosDormindo: 0,
  valorPipelineAberto: 0,
  clientesNovosMes: 0,
  orcamentosGanhosMes: 0,
  alertasFollowUp: [],
  ultimas5: [],
})

describe('buildDashboardAgentContext', () => {
  it('produces valid JSON with expected top-level keys', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-15T12:00:00.000Z'))
    const json = buildDashboardAgentContext(emptyDashboard(), '2025-06-15', 'org-test')
    const parsed = JSON.parse(json) as Record<string, unknown>
    expect(parsed.contractVersion).toBe(1)
    expect(parsed.screen).toBe('dashboard')
    expect(parsed.organizationId).toBe('org-test')
    expect(parsed.hoje).toBe('2025-06-15')
    expect(parsed.janelaFollowUpDias).toBe(7)
    expect(parsed.metricas).toEqual(
      expect.objectContaining({
        totalClientes: 0,
        orcamentosEmAberto: 0,
        valorPipelineAberto: 0,
      })
    )
    expect(Array.isArray(parsed.filaFollowUp)).toBe(true)
    expect(Array.isArray(parsed.ultimasInteracoes)).toBe(true)
    vi.useRealTimers()
  })

  it('maps follow-up queue and clips long notes', () => {
    const data: DashboardData = {
      ...emptyDashboard(),
      alertasFollowUp: [
        {
          id: 'o1',
          user_id: 'u',
          organization_id: 'org-1',
          cliente_id: 'c1',
          produto_id: null,
          display_num: 1,
          tax_id: null,
          produto_descricao: 'P',
          valor: 10,
          status: 'dormindo',
          data_orcamento: '2025-01-01',
          follow_up_at: '2025-06-20',
          lost_reason: null,
          created_at: '',
          updated_at: '',
          clientes: { nome: 'Cliente X' },
          produtos: null,
        },
      ],
      ultimas5: [
        {
          id: 'i1',
          user_id: 'u',
          organization_id: 'org-1',
          cliente_id: 'c1',
          orcamento_id: null,
          canal: 'WhatsApp',
          anotacao: 'x'.repeat(300),
          data_contato: '2025-06-01T00:00:00Z',
          created_at: '',
          clientes: { nome: 'Cliente X' },
        },
      ],
    }
    const parsed = JSON.parse(buildDashboardAgentContext(data, '2025-06-15', null)) as {
      filaFollowUp: { clienteNome: string }[]
      ultimasInteracoes: { anotacao: string }[]
    }
    expect(parsed.filaFollowUp[0]!.clienteNome).toBe('Cliente X')
    expect(parsed.ultimasInteracoes[0]!.anotacao.endsWith('…')).toBe(true)
    expect(parsed.ultimasInteracoes[0]!.anotacao.length).toBeLessThanOrEqual(281)
  })
})
