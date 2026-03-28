import { describe, expect, it } from 'vitest'
import {
  clienteMatchesSearch,
  clientesListKpis,
  filterAndSortClientes,
  formatUltimoContatoLabel,
  isSemContactoLongo,
} from '@/lib/clienteListHelpers'
import type { ClienteListItem } from '@/types/database'

function c(partial: Partial<ClienteListItem>): ClienteListItem {
  return {
    id: '1',
    user_id: 'u',
    nome: 'ACME',
    tax_id: null,
    document_enrichment: null,
    tipo: 'novo',
    ativo: true,
    whatsapp: null,
    telefone: null,
    produtos_habituais: null,
    observacoes: null,
    cor: null,
    iniciais: null,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    ultimo_contato: null,
    ...partial,
  }
}

describe('clienteMatchesSearch', () => {
  it('matches nome', () => {
    expect(clienteMatchesSearch(c({ nome: 'Padaria Silva' }), 'silva')).toBe(true)
  })
  it('matches tax_id digits', () => {
    expect(clienteMatchesSearch(c({ tax_id: '12345678901234' }), '567890')).toBe(true)
  })
  it('matches produtos_habituais', () => {
    expect(clienteMatchesSearch(c({ produtos_habituais: 'caixas kraft' }), 'kraft')).toBe(true)
  })
})

describe('filterAndSortClientes', () => {
  const list = [
    c({ id: 'a', nome: 'B', tipo: 'novo', ultimo_contato: '2024-06-01T00:00:00Z' }),
    c({ id: 'b', nome: 'A', tipo: 'recompra', ultimo_contato: '2024-07-01T00:00:00Z' }),
  ]
  const baseOpts = { q: '', tipo: 'todos' as const, phone: 'todos' as const, archive: 'todos' as const }
  it('sorts by nome asc', () => {
    const out = filterAndSortClientes(list, { ...baseOpts, sort: 'nome_asc' })
    expect(out.map((x) => x.id)).toEqual(['b', 'a'])
  })
  it('filters tipo recompra', () => {
    const out = filterAndSortClientes(list, { ...baseOpts, tipo: 'recompra', sort: 'nome_asc' })
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('b')
  })
  it('filters arquivados only', () => {
    const mixed = [c({ id: 'x', nome: 'X', ativo: false }), c({ id: 'y', nome: 'Y', ativo: true })]
    const out = filterAndSortClientes(mixed, { ...baseOpts, archive: 'arquivados', sort: 'nome_asc' })
    expect(out.map((z) => z.id)).toEqual(['x'])
  })
})

describe('clientesListKpis', () => {
  it('counts ativos vs arquivados', () => {
    const k = clientesListKpis([
      c({ id: '1', ativo: true, tipo: 'recompra' }),
      c({ id: '2', ativo: true, tipo: 'novo' }),
      c({ id: '3', ativo: false }),
    ])
    expect(k.ativos).toBe(2)
    expect(k.arquivados).toBe(1)
    expect(k.recompras).toBe(1)
  })
})

describe('formatUltimoContatoLabel', () => {
  it('handles null', () => {
    expect(formatUltimoContatoLabel(null)).toContain('Sem contacto')
  })
})

describe('isSemContactoLongo', () => {
  it('true when null', () => {
    expect(isSemContactoLongo(null, 30)).toBe(true)
  })
})
