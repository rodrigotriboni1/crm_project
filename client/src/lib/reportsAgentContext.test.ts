import { describe, expect, it, vi } from 'vitest'
import { buildReportsAgentContext } from '@/lib/reportsAgentContext'
import type { ReportsData } from '@/api/reports'

function emptyReports(): ReportsData {
  const z = { count: 0, valorSum: 0 }
  return {
    range: { start: '2026-03-01', end: '2026-03-31' },
    totalOrcamentosNoPeriodo: 0,
    valorEmAbertoNoPeriodo: 0,
    valorGanhoNoPeriodo: 0,
    porStatus: {
      novo_contato: { ...z },
      orcamento_enviado: { ...z },
      dormindo: { ...z },
      ganho: { ...z },
      perdido: { ...z },
    },
    seriePorDia: [],
    topClientes: [],
    interacoesPorCanal: [],
    orcamentosResumo: [],
  }
}

describe('buildReportsAgentContext', () => {
  it('produces valid JSON with expected top-level keys', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-15T12:00:00.000Z'))
    const json = buildReportsAgentContext(emptyReports())
    const parsed = JSON.parse(json) as Record<string, unknown>
    expect(parsed.periodo).toEqual({ start: '2026-03-01', end: '2026-03-31' })
    expect(parsed.totais).toEqual(
      expect.objectContaining({
        totalOrcamentosNoPeriodo: 0,
        valorEmAbertoNoPeriodo: 0,
        valorGanhoNoPeriodo: 0,
      })
    )
    expect(Array.isArray(parsed.seriePorDia)).toBe(true)
    expect(Array.isArray(parsed.orcamentosAmostra)).toBe(true)
    vi.useRealTimers()
  })

  it('truncates orcamentos list beyond cap', () => {
    const many = Array.from({ length: 60 }, (_, i) => ({
      id: `o${i}`,
      display_num: i + 1,
      clienteNome: 'C',
      status: 'novo_contato' as const,
      valor: 1,
      data_orcamento: '2026-03-01',
    }))
    const data: ReportsData = { ...emptyReports(), orcamentosResumo: many }
    const parsed = JSON.parse(buildReportsAgentContext(data)) as {
      orcamentosAmostra: unknown[]
      orcamentosAmostraTruncada: boolean
    }
    expect(parsed.orcamentosAmostra).toHaveLength(50)
    expect(parsed.orcamentosAmostraTruncada).toBe(true)
  })
})
