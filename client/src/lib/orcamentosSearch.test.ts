import { describe, expect, it } from 'vitest'
import { digitsOnly, filterOrcamentosByQuery } from '@/lib/orcamentosSearch'
import type { OrcamentoRow } from '@/api/crm'

function row(partial: Partial<OrcamentoRow> & Pick<OrcamentoRow, 'id' | 'cliente_id'>): OrcamentoRow {
  return {
    user_id: 'u1',
    organization_id: 'org-1',
    produto_id: null,
    display_num: 42,
    tax_id: '12.345.678/0001-90',
    produto_descricao: 'Caixa papel',
    valor: 10,
    status: 'novo_contato',
    data_orcamento: '2025-01-01',
    follow_up_at: null,
    lost_reason: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    clientes: { nome: 'Indústria Sul' },
    produtos: { nome: 'Saco', codigo: 'SC-01', categoria: 'Plástico' },
    ...partial,
  }
}

describe('digitsOnly', () => {
  it('strips non-digits', () => {
    expect(digitsOnly('a1b2c3')).toBe('123')
  })
})

describe('filterOrcamentosByQuery', () => {
  const rows = [
    row({ id: '1', cliente_id: 'c1' }),
    row({
      id: '2',
      cliente_id: 'c2',
      clientes: { nome: 'Outro' },
      produto_descricao: 'outro produto',
      display_num: 7,
      tax_id: null,
      produtos: null,
    }),
  ]

  it('returns all when query blank', () => {
    expect(filterOrcamentosByQuery(rows, '  ')).toEqual(rows)
  })

  it('matches cliente nome', () => {
    expect(filterOrcamentosByQuery(rows, 'sul').map((r) => r.id)).toEqual(['1'])
  })

  it('matches produto_descricao and catalog fields', () => {
    expect(filterOrcamentosByQuery(rows, 'plástico').map((r) => r.id)).toEqual(['1'])
    expect(filterOrcamentosByQuery(rows, 'sc-01').map((r) => r.id)).toEqual(['1'])
  })

  it('matches display_num digits', () => {
    expect(filterOrcamentosByQuery(rows, '00000042').map((r) => r.id)).toEqual(['1'])
    expect(filterOrcamentosByQuery(rows, '42').map((r) => r.id)).toEqual(['1'])
  })

  it('matches tax_id substring and digits-only CNPJ when 3+ digits', () => {
    expect(filterOrcamentosByQuery(rows, '678/0001').map((r) => r.id)).toEqual(['1'])
    expect(filterOrcamentosByQuery(rows, '12345678000190').map((r) => r.id)).toEqual(['1'])
  })
})
