import type { OrcamentoRow } from '@/api/crm'

export type ClienteCardGroup = {
  cliente_id: string
  clienteNome: string
  cards: OrcamentoRow[]
}

export type KanbanGroupMode =
  | 'none'
  | 'cliente'
  | 'categoria'
  | 'produto'
  | 'faixa_valor'
  | 'mes_orcamento'

export const KANBAN_GROUP_MODE_LABELS: Record<KanbanGroupMode, string> = {
  none: 'Nenhum',
  cliente: 'Por cliente',
  categoria: 'Por categoria (produto)',
  produto: 'Por produto',
  faixa_valor: 'Por faixa de valor',
  mes_orcamento: 'Por mês (data orçamento)',
}

function valorBucket(v: number): number {
  if (v < 1000) return 0
  if (v < 5000) return 1
  if (v < 20000) return 2
  return 3
}

function produtoSortKey(o: OrcamentoRow): string {
  if (o.produto_id) {
    const n = o.produtos?.nome?.trim()
    if (n) return n
  }
  return (o.produto_descricao ?? '').trim() || '\uFFFF'
}

function categoriaSortKey(o: OrcamentoRow): string {
  const c = o.produtos?.categoria?.trim()
  return c || '\uFFFF'
}

/**
 * Ordena cartões dentro da coluna para aproximar visualmente o modo de agrupamento (sem alterar drag ids).
 */
export function applyKanbanGrouping(mode: KanbanGroupMode, items: OrcamentoRow[]): OrcamentoRow[] {
  if (mode === 'none') return items
  if (mode === 'cliente') {
    return groupOrcamentosByCliente(items).flatMap((g) => g.cards)
  }
  const copy = [...items]
  if (mode === 'categoria') {
    return copy.sort((a, b) => {
      const ca = categoriaSortKey(a)
      const cb = categoriaSortKey(b)
      const emptyA = ca === '\uFFFF'
      const emptyB = cb === '\uFFFF'
      if (emptyA !== emptyB) return emptyA ? 1 : -1
      const c = ca.localeCompare(cb, 'pt-BR')
      if (c !== 0) return c
      return Number(b.valor) - Number(a.valor)
    })
  }
  if (mode === 'produto') {
    return copy.sort((a, b) => {
      const pa = produtoSortKey(a)
      const pb = produtoSortKey(b)
      const c = pa.localeCompare(pb, 'pt-BR')
      if (c !== 0) return c
      return Number(b.valor) - Number(a.valor)
    })
  }
  if (mode === 'faixa_valor') {
    return copy.sort((a, b) => {
      const ba = valorBucket(Number(a.valor))
      const bb = valorBucket(Number(b.valor))
      if (ba !== bb) return bb - ba
      return Number(b.valor) - Number(a.valor)
    })
  }
  if (mode === 'mes_orcamento') {
    return copy.sort((a, b) => {
      const ma = a.data_orcamento.slice(0, 7)
      const mb = b.data_orcamento.slice(0, 7)
      const c = mb.localeCompare(ma)
      if (c !== 0) return c
      return Number(b.valor) - Number(a.valor)
    })
  }
  return items
}

/** Agrupa cartões por cliente para exibir vários negócios do mesmo cliente juntos (base para “concatenamento”). */
export function groupOrcamentosByCliente(items: OrcamentoRow[]): ClienteCardGroup[] {
  const m = new Map<string, OrcamentoRow[]>()
  for (const o of items) {
    const list = m.get(o.cliente_id) ?? []
    list.push(o)
    m.set(o.cliente_id, list)
  }
  return [...m.entries()]
    .map(([cliente_id, cards]) => {
      const sorted = [...cards].sort((a, b) => Number(b.valor) - Number(a.valor))
      return {
        cliente_id,
        clienteNome: sorted[0]?.clientes?.nome ?? 'Cliente',
        cards: sorted,
      }
    })
    .sort((a, b) => a.clienteNome.localeCompare(b.clienteNome, 'pt-BR'))
}
