import type { OrcamentoRow } from '@/api/crm'

export type ClienteCardGroup = {
  cliente_id: string
  clienteNome: string
  cards: OrcamentoRow[]
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
