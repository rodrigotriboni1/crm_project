import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import type { OrcamentoRow } from '@/api/crm'
import type { OrcamentoStatus } from '@/types/database'
import {
  orcamentoStatusLabel,
  ORCAMENTO_STATUS_ORDER,
} from '@/hooks/useCrm'
import { SelectNative } from '@/components/ui/select-native'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { digitsOnly, formatCpfCnpj } from '@/lib/formatters'
import { formatOrcamentoDisplayNum } from '@/lib/orcamentoDisplayNum'

function brl(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

/** Rótulo explícito: CPF (11 dígitos), CNPJ (14); resto mostra só o valor formatado (rascunho / inválido). */
function documentoCpfCnpj(tax: string | null | undefined): { tipo: 'CPF' | 'CNPJ' | null; texto: string } {
  const d = digitsOnly(tax ?? '')
  if (!d) return { tipo: null, texto: '—' }
  const texto = formatCpfCnpj(d)
  if (d.length === 11) return { tipo: 'CPF', texto }
  if (d.length === 14) return { tipo: 'CNPJ', texto }
  return { tipo: null, texto }
}

type Props = {
  rows: OrcamentoRow[]
  savingId: string | null
  onOpenDetail: (id: string) => void
  /** Se true, status é um select (Kanban / tabela com edição). Se false, só texto (tela Orçamentos). */
  editableStatus?: boolean
  onStatusChange?: (o: OrcamentoRow, status: OrcamentoStatus) => void
}

export default function KanbanTableView({
  rows,
  savingId,
  onOpenDetail,
  editableStatus = true,
  onStatusChange,
}: Props) {
  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
            <th className="sticky top-0 z-[1] bg-muted/95 px-3 py-2.5 backdrop-blur-sm">Cliente</th>
            <th className="sticky top-0 z-[1] bg-muted/95 px-3 py-2.5 backdrop-blur-sm">CPF / CNPJ</th>
            <th className="sticky top-0 z-[1] bg-muted/95 px-3 py-2.5 backdrop-blur-sm">Produto</th>
            <th className="sticky top-0 z-[1] bg-muted/95 px-3 py-2.5 text-right backdrop-blur-sm tabular-nums">
              Valor
            </th>
            <th className="sticky top-0 z-[1] bg-muted/95 px-3 py-2.5 backdrop-blur-sm tabular-nums">Nº</th>
            <th className="sticky top-0 z-[1] bg-muted/95 px-3 py-2.5 backdrop-blur-sm">Estado</th>
            <th className="sticky top-0 z-[1] bg-muted/95 px-3 py-2.5 backdrop-blur-sm">Follow-up</th>
            <th className="sticky top-0 z-[1] w-[1%] whitespace-nowrap bg-muted/95 px-3 py-2.5 text-right backdrop-blur-sm">
              Ações
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                Nenhum orçamento com o filtro atual.
              </td>
            </tr>
          ) : (
            rows.map((o) => {
              const doc = documentoCpfCnpj(o.tax_id)
              return (
                <tr
                  key={o.id}
                  className="border-b border-border/70 transition-colors hover:bg-muted/25 last:border-b-0"
                >
                  <td className="max-w-[14rem] px-3 py-2.5 align-top">
                    <span className="line-clamp-2 font-medium text-foreground">{o.clientes?.nome ?? '—'}</span>
                  </td>
                  <td className="w-[9.5rem] min-w-[8.5rem] max-w-[12rem] px-3 py-2.5 align-top">
                    {doc.tipo ? (
                      <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {doc.tipo}
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        'block font-mono text-xs tabular-nums leading-snug',
                        doc.texto === '—' ? 'text-muted-foreground' : 'text-foreground'
                      )}
                    >
                      {doc.texto}
                    </span>
                  </td>
                  <td className="max-w-[18rem] px-3 py-2.5 align-top">
                    <span className="line-clamp-2 text-muted-foreground">{o.produto_descricao || '—'}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right align-top font-semibold tabular-nums">
                    {brl(Number(o.valor))}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 align-top font-mono text-xs font-semibold tabular-nums">
                    {formatOrcamentoDisplayNum(o.display_num ?? 0)}
                  </td>
                  <td className="min-w-[9.5rem] px-3 py-2.5 align-top">
                    {editableStatus && onStatusChange ? (
                      <SelectNative
                        className="h-9 w-full min-w-[8.5rem] text-xs"
                        value={o.status}
                        disabled={savingId === o.id}
                        onChange={(e) => onStatusChange(o, e.target.value as OrcamentoStatus)}
                      >
                        {ORCAMENTO_STATUS_ORDER.map((s) => (
                          <option key={s} value={s}>
                            {orcamentoStatusLabel(s)}
                          </option>
                        ))}
                      </SelectNative>
                    ) : (
                      <span className="text-sm text-muted-foreground">{orcamentoStatusLabel(o.status)}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 align-top text-sm text-muted-foreground tabular-nums">
                    {o.follow_up_at
                      ? new Date(o.follow_up_at + 'T12:00:00').toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <div className="flex flex-col items-stretch gap-1.5 sm:flex-row sm:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => onOpenDetail(o.id)}
                      >
                        Abrir
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="h-8 px-2" asChild>
                        <Link
                          to={`/clientes/${o.cliente_id}`}
                          title="Ficha do cliente"
                          className="inline-flex items-center justify-center gap-1"
                        >
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                          <span className="sr-only sm:not-sr-only sm:inline">Cliente</span>
                        </Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
