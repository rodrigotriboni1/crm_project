import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchReportsData } from './reports'

function createThenableChain(response: unknown) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    not: () => chain,
    lte: () => chain,
    gte: () => chain,
    order: () => chain,
    then(onFulfilled: (v: unknown) => unknown) {
      return Promise.resolve(response).then(onFulfilled)
    },
    catch(onRejected: (e: unknown) => unknown) {
      return Promise.resolve(response).catch(onRejected)
    },
  }
  return chain
}

function createMockSupabase(responses: unknown[]) {
  let i = 0
  return {
    from() {
      const response = responses[i] ?? { data: null, error: new Error('unexpected query') }
      i += 1
      return createThenableChain(response) as unknown as ReturnType<SupabaseClient['from']>
    },
  } as unknown as SupabaseClient
}

const baseRow = {
  user_id: 'u',
  cliente_id: 'c1',
  produto_id: null,
  tax_id: null,
  produto_descricao: '',
  lost_reason: null,
  created_at: '',
  updated_at: '',
  produtos: null,
}

describe('fetchReportsData', () => {
  it('rejeita intervalo inválido', async () => {
    const sb = createMockSupabase([])
    await expect(fetchReportsData(sb, 'u', { start: '2026-02-01', end: '2026-01-01' })).rejects.toThrow(
      'Data inicial não pode ser posterior',
    )
  })

  it('agrega por status, série diária, top clientes e canais', async () => {
    const orcData = [
      {
        ...baseRow,
        id: 'o1',
        display_num: 1,
        status: 'ganho' as const,
        valor: 100,
        data_orcamento: '2026-03-01',
        clientes: { nome: 'A' },
      },
      {
        ...baseRow,
        id: 'o2',
        display_num: 2,
        cliente_id: 'c2',
        status: 'novo_contato' as const,
        valor: 50,
        data_orcamento: '2026-03-01',
        clientes: { nome: 'B' },
      },
      {
        ...baseRow,
        id: 'o3',
        display_num: 3,
        status: 'orcamento_enviado' as const,
        valor: 30,
        data_orcamento: '2026-03-02',
        clientes: { nome: 'A' },
      },
    ]
    const responses = [
      { data: orcData, error: null },
      { data: [{ canal: 'email' }, { canal: 'email' }, { canal: 'telefone' }], error: null },
    ]
    const sb = createMockSupabase(responses)
    const r = await fetchReportsData(sb, 'u', { start: '2026-03-01', end: '2026-03-31' })

    expect(r.range).toEqual({ start: '2026-03-01', end: '2026-03-31' })
    expect(r.totalOrcamentosNoPeriodo).toBe(3)
    expect(r.valorGanhoNoPeriodo).toBe(100)
    expect(r.valorEmAbertoNoPeriodo).toBe(80)
    expect(r.porStatus.ganho.count).toBe(1)
    expect(r.porStatus.novo_contato.count).toBe(1)
    expect(r.porStatus.orcamento_enviado.count).toBe(1)
    expect(r.seriePorDia).toEqual([
      { date: '2026-03-01', count: 2 },
      { date: '2026-03-02', count: 1 },
    ])
    expect(r.topClientes[0].clienteNome).toBe('A')
    expect(r.topClientes[0].valorTotal).toBe(130)
    expect(r.interacoesPorCanal).toEqual([
      { canal: 'email', count: 2 },
      { canal: 'telefone', count: 1 },
    ])
    expect(r.orcamentosResumo).toHaveLength(3)
  })
})
