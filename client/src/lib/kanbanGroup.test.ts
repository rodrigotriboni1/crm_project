import { describe, expect, it } from 'vitest'
import { groupOrcamentosByCliente } from '@/lib/kanbanGroup'
import type { OrcamentoRow } from '@/api/crm'

function row(partial: Partial<OrcamentoRow> & Pick<OrcamentoRow, 'id' | 'cliente_id' | 'valor'>): OrcamentoRow {
  return {
    user_id: 'u1',
    organization_id: 'org-1',
    produto_id: null,
    display_num: 1,
    tax_id: null,
    produto_descricao: '',
    status: 'novo_contato',
    data_orcamento: '2025-01-01',
    follow_up_at: null,
    lost_reason: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    clientes: { nome: 'X' },
    produtos: null,
    ...partial,
  }
}

describe('groupOrcamentosByCliente', () => {
  it('returns empty for empty input', () => {
    expect(groupOrcamentosByCliente([])).toEqual([])
  })

  it('groups by cliente_id, sorts cards by valor desc, groups by nome pt-BR', () => {
    const a = row({
      id: '1',
      cliente_id: 'c-b',
      valor: 100,
      clientes: { nome: 'Bravo' },
    })
    const b = row({
      id: '2',
      cliente_id: 'c-b',
      valor: 300,
      clientes: { nome: 'Bravo' },
    })
    const c = row({
      id: '3',
      cliente_id: 'c-a',
      valor: 50,
      clientes: { nome: 'Alpha' },
    })
    const groups = groupOrcamentosByCliente([a, b, c])
    expect(groups.map((g) => g.cliente_id)).toEqual(['c-a', 'c-b'])
    expect(groups[0]!.cards.map((x) => x.id)).toEqual(['3'])
    expect(groups[1]!.cards.map((x) => x.id)).toEqual(['2', '1'])
  })

  it('uses fallback cliente label when nome missing', () => {
    const o = row({
      id: '1',
      cliente_id: 'c1',
      valor: 1,
      clientes: undefined,
    })
    expect(groupOrcamentosByCliente([o])[0]!.clienteNome).toBe('Cliente')
  })
})
