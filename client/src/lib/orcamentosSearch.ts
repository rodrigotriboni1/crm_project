import type { OrcamentoRow } from '@/api/crm'
import { formatOrcamentoDisplayNum } from '@/lib/orcamentoDisplayNum'

export function digitsOnly(s: string) {
  return s.replace(/\D/g, '')
}

/** Mesma regra de busca usada no Kanban (nome, produto, tax_id, número do cartão). */
export function filterOrcamentosByQuery(rows: OrcamentoRow[], query: string): OrcamentoRow[] {
  const raw = query.trim()
  const s = raw.toLowerCase()
  const d = digitsOnly(raw)
  if (!s) return rows
  return rows.filter((o) => {
    const nome = (o.clientes?.nome ?? '').toLowerCase()
    const prod = (o.produto_descricao ?? '').toLowerCase()
    const tax = (o.tax_id ?? '').toLowerCase()
    const pCat = (o.produtos?.categoria ?? '').toLowerCase()
    const pNome = (o.produtos?.nome ?? '').toLowerCase()
    const pCod = (o.produtos?.codigo ?? '').toLowerCase()
    const num = o.display_num ?? 0
    const numPadded = formatOrcamentoDisplayNum(num)
    const matchesDisplayNum =
      d.length >= 1 && (String(num).includes(d) || numPadded.includes(d))
    return (
      nome.includes(s) ||
      prod.includes(s) ||
      tax.includes(s) ||
      pCat.includes(s) ||
      pNome.includes(s) ||
      pCod.includes(s) ||
      matchesDisplayNum ||
      (d.length >= 3 && digitsOnly(o.tax_id ?? '').includes(d))
    )
  })
}
