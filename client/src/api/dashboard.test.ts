import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import * as interacoesMod from './interacoes'
import { fetchDashboard } from './dashboard'

function createThenableChain(response: unknown) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    not: () => chain,
    lte: () => chain,
    gte: () => chain,
    order: () => chain,
    limit: () => chain,
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

describe('fetchDashboard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-15T12:00:00.000Z'))
    vi.spyOn(interacoesMod, 'listRecentInteracoes').mockResolvedValue([])
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('agrega contagens, soma pipeline e ordena alertas (atrasados primeiro)', async () => {
    const alertA = {
      id: 'a1',
      follow_up_at: '2025-06-20',
      user_id: 'u',
      cliente_id: 'c',
      produto_id: null,
      display_num: 1,
      tax_id: null,
      produto_descricao: '',
      valor: 0,
      status: 'dormindo' as const,
      data_orcamento: '2025-01-01',
      created_at: '',
      updated_at: '',
      clientes: { nome: 'X' },
      produtos: null,
    }
    const alertB = {
      ...alertA,
      id: 'a2',
      follow_up_at: '2025-06-10',
    }
    const responses = [
      { count: 5, error: null },
      { count: 2, error: null },
      { count: 1, error: null },
      { count: 3, error: null },
      { count: 4, error: null },
      { data: [{ valor: 100 }, { valor: 25.5 }], error: null },
      { data: [alertA, alertB], error: null },
    ]
    const sb = createMockSupabase(responses)
    const result = await fetchDashboard(sb, 'user-1')

    expect(result.totalClientes).toBe(5)
    expect(result.orcamentosEmAberto).toBe(2)
    expect(result.orcamentosDormindo).toBe(1)
    expect(result.clientesNovosMes).toBe(3)
    expect(result.orcamentosGanhosMes).toBe(4)
    expect(result.valorPipelineAberto).toBe(125.5)
    expect(result.alertasFollowUp.map((o) => o.id)).toEqual(['a2', 'a1'])
    expect(result.ultimas5).toEqual([])
    expect(interacoesMod.listRecentInteracoes).toHaveBeenCalledWith(sb, 'user-1', 5)
  })
})
