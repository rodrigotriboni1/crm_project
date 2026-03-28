import { describe, expect, it } from 'vitest'
import {
  clienteMatchesSearch,
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
  it('sorts by nome asc', () => {
    const out = filterAndSortClientes(list, { q: '', tipo: 'todos', phone: 'todos', sort: 'nome_asc' })
    expect(out.map((x) => x.id)).toEqual(['b', 'a'])
  })
  it('filters tipo recompra', () => {
    const out = filterAndSortClientes(list, { q: '', tipo: 'recompra', phone: 'todos', sort: 'nome_asc' })
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('b')
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
