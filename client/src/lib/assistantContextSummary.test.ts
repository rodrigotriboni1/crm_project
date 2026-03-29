import { describe, expect, it } from 'vitest'
import {
  describeAssistantScreenContext,
  parseAssistantContextJson,
} from '@/lib/assistantContextSummary'

describe('parseAssistantContextJson', () => {
  it('parses valid JSON', () => {
    expect(parseAssistantContextJson('{"a":1}')).toEqual({ a: 1 })
  })
  it('returns null on invalid', () => {
    expect(parseAssistantContextJson('not json')).toBeNull()
  })
})

describe('describeAssistantScreenContext', () => {
  it('dashboard lists metrics and queues', () => {
    const parsed = {
      geradoEm: '2025-01-15T12:00:00.000Z',
      hoje: '2025-01-15',
      janelaFollowUpDias: 7,
      metricas: {
        totalClientes: 10,
        orcamentosEmAberto: 3,
        valorPipelineAberto: 1500,
        orcamentosDormindo: 1,
        clientesNovosMes: 2,
        orcamentosGanhosMes: 4,
      },
      filaFollowUp: [{ id: '1' }],
      ultimasInteracoes: [{}, {}, {}],
    }
    const s = describeAssistantScreenContext('dashboard', parsed)
    expect(s.bullets.some((b) => b.includes('2025-01-15'))).toBe(true)
    expect(s.bullets.some((b) => b.includes('10 clientes'))).toBe(true)
    expect(s.bullets.some((b) => b.includes('1 orçamento'))).toBe(true)
    expect(s.bullets.some((b) => b.includes('3 registo'))).toBe(true)
    expect(s.footer).toMatch(/Dados gerados em/)
  })

  it('reports lists period and totals', () => {
    const parsed = {
      geradoEm: '2025-01-01T00:00:00.000Z',
      periodo: { start: '2025-01-01', end: '2025-01-31' },
      totais: {
        totalOrcamentosNoPeriodo: 5,
        valorEmAbertoNoPeriodo: 100,
        valorGanhoNoPeriodo: 200,
      },
      porStatus: { novo_contato: { count: 2, valorSum: 50 } },
      interacoesPorCanal: [{ canal: 'whatsapp', count: 3 }],
      orcamentosAmostra: [{ id: 'x' }],
      orcamentosAmostraTruncada: false,
      notas: {},
    }
    const s = describeAssistantScreenContext('reports', parsed)
    expect(s.bullets.some((b) => b.includes('2025-01-01'))).toBe(true)
    expect(s.bullets.some((b) => b.includes('5 orçamentos'))).toBe(true)
    expect(s.bullets.some((b) => b.includes('1 linha'))).toBe(true)
  })

  it('generic explains route', () => {
    const s = describeAssistantScreenContext('generic', { rota: '/clientes', tela: 'Clientes' })
    expect(s.bullets.some((b) => b.includes('/clientes'))).toBe(true)
    expect(s.bullets.some((b) => b.includes('Clientes'))).toBe(true)
    expect(s.bullets.some((b) => b.includes('Não há snapshot'))).toBe(true)
  })
})
