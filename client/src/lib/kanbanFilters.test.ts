import { describe, expect, it } from 'vitest'
import {
  applyKanbanAdvancedFilters,
  countActiveKanbanAdvancedFilters,
  defaultKanbanAdvancedFilters,
  KANBAN_SEM_CATEGORIA_VALUE,
} from '@/lib/kanbanFilters'
import type { OrcamentoRow } from '@/api/crm'

function row(partial: Partial<OrcamentoRow> & Pick<OrcamentoRow, 'id' | 'cliente_id'>): OrcamentoRow {
  return {
    user_id: 'u1',
    organization_id: 'org-1',
    produto_id: null,
    display_num: 1,
    tax_id: null,
    produto_descricao: 'X',
    valor: 100,
    status: 'novo_contato',
    data_orcamento: '2025-06-15',
    follow_up_at: null,
    lost_reason: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    clientes: { nome: 'Cliente' },
    produtos: null,
    ...partial,
  }
}

describe('applyKanbanAdvancedFilters', () => {
  it('returns all rows when filters are default', () => {
    const a = row({ id: '1', cliente_id: 'c1' })
    const b = row({ id: '2', cliente_id: 'c2', valor: 200 })
    expect(applyKanbanAdvancedFilters([a, b], defaultKanbanAdvancedFilters(), '2025-06-20')).toHaveLength(2)
  })

  it('filters by valor min and max', () => {
    const a = row({ id: '1', cliente_id: 'c1', valor: 100 })
    const b = row({ id: '2', cliente_id: 'c2', valor: 500 })
    const f = { ...defaultKanbanAdvancedFilters(), valorMin: '200', valorMax: '600' }
    const out = applyKanbanAdvancedFilters([a, b], f, '2025-06-20')
    expect(out.map((x) => x.id)).toEqual(['2'])
  })

  it('filters by data_orcamento range', () => {
    const a = row({ id: '1', cliente_id: 'c1', data_orcamento: '2025-01-01' })
    const b = row({ id: '2', cliente_id: 'c2', data_orcamento: '2025-06-01' })
    const f = { ...defaultKanbanAdvancedFilters(), dataOrcDe: '2025-05-01', dataOrcAte: '2025-06-30' }
    expect(applyKanbanAdvancedFilters([a, b], f, '2025-06-20').map((x) => x.id)).toEqual(['2'])
  })

  it('filters catalogo vs personalizado', () => {
    const a = row({ id: '1', cliente_id: 'c1', produto_id: 'p1' })
    const b = row({ id: '2', cliente_id: 'c2', produto_id: null })
    const fCat = { ...defaultKanbanAdvancedFilters(), produtoOrigem: 'catalogo' as const }
    expect(applyKanbanAdvancedFilters([a, b], fCat, '2025-06-20').map((x) => x.id)).toEqual(['1'])
    const fPers = { ...defaultKanbanAdvancedFilters(), produtoOrigem: 'personalizado' as const }
    expect(applyKanbanAdvancedFilters([a, b], fPers, '2025-06-20').map((x) => x.id)).toEqual(['2'])
  })

  it('filters by categoria', () => {
    const a = row({
      id: '1',
      cliente_id: 'c1',
      produto_id: 'p1',
      produtos: { nome: 'P', codigo: null, categoria: 'Embalagens' },
    })
    const b = row({ id: '2', cliente_id: 'c2', produtos: { nome: 'Q', codigo: null, categoria: null } })
    const f = { ...defaultKanbanAdvancedFilters(), categoria: 'Embalagens' }
    expect(applyKanbanAdvancedFilters([a, b], f, '2025-06-20').map((x) => x.id)).toEqual(['1'])
    const fSem = { ...defaultKanbanAdvancedFilters(), categoria: KANBAN_SEM_CATEGORIA_VALUE }
    expect(applyKanbanAdvancedFilters([a, b], fSem, '2025-06-20').map((x) => x.id)).toEqual(['2'])
  })

  it('filters lost_reason contains', () => {
    const a = row({ id: '1', cliente_id: 'c1', lost_reason: 'Preço alto' })
    const b = row({ id: '2', cliente_id: 'c2', lost_reason: null })
    const f = { ...defaultKanbanAdvancedFilters(), lostReasonContains: 'preço' }
    expect(applyKanbanAdvancedFilters([a, b], f, '2025-06-20').map((x) => x.id)).toEqual(['1'])
  })

  it('filters follow-up overdue', () => {
    const a = row({ id: '1', cliente_id: 'c1', follow_up_at: '2025-01-01' })
    const b = row({ id: '2', cliente_id: 'c2', follow_up_at: '2030-01-01' })
    const f = { ...defaultKanbanAdvancedFilters(), followUp: 'overdue' as const }
    expect(applyKanbanAdvancedFilters([a, b], f, '2025-06-20').map((x) => x.id)).toEqual(['1'])
  })
})

describe('countActiveKanbanAdvancedFilters', () => {
  it('counts non-default fields', () => {
    expect(countActiveKanbanAdvancedFilters(defaultKanbanAdvancedFilters())).toBe(0)
    expect(
      countActiveKanbanAdvancedFilters({
        ...defaultKanbanAdvancedFilters(),
        valorMin: '1',
        followUp: 'today',
      })
    ).toBe(2)
  })
})
