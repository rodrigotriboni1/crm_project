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
import { formatOrcamentoDisplayNum } from '@/lib/orcamentoDisplayNum'

function brl(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

const grid =
  'grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,90px)_minmax(0,100px)_minmax(0,88px)_minmax(0,130px)_minmax(0,90px)_minmax(0,72px)] gap-2 items-center'

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
    <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-[#d4d2c8] bg-white">
      <div className="min-w-[820px]">
        <div
          className={cn(
            grid,
            'border-b border-[#d4d2c8] bg-muted/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'
          )}
        >
          <span>Cliente</span>
          <span>Produto</span>
          <span className="text-right">Valor</span>
          <span>Tax ID</span>
          <span>Nº cartão</span>
          <span>Status</span>
          <span>Follow-up</span>
          <span />
        </div>
        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Nenhum orçamento com o filtro atual.
          </p>
        ) : (
          rows.map((o, idx) => (
            <div
              key={o.id}
              className={cn(
                grid,
                'border-b border-border/60 px-3 py-2 text-xs hover:bg-muted/20',
                idx === rows.length - 1 && 'border-b-0'
              )}
            >
              <span className="truncate font-medium">{o.clientes?.nome ?? '—'}</span>
              <span className="truncate text-muted-foreground">{o.produto_descricao || '—'}</span>
              <span className="text-right font-semibold tabular-nums">{brl(Number(o.valor))}</span>
              <span className="truncate font-mono text-[10px]">{o.tax_id?.trim() || '—'}</span>
              <span className="font-mono text-[11px] font-semibold tabular-nums">
                {formatOrcamentoDisplayNum(o.display_num ?? 0)}
              </span>
              <div className="min-w-0">
                {editableStatus && onStatusChange ? (
                  <SelectNative
                    className="h-8 text-[11px]"
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
                  <span className="text-[11px] text-muted-foreground">
                    {orcamentoStatusLabel(o.status)}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground">
                {o.follow_up_at
                  ? new Date(o.follow_up_at + 'T12:00:00').toLocaleDateString('pt-BR')
                  : '—'}
              </span>
              <div className="flex flex-wrap gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-[10px]"
                  onClick={() => onOpenDetail(o.id)}
                >
                  Abrir
                </Button>
                <Link
                  to={`/clientes/${o.cliente_id}`}
                  className="inline-flex h-7 items-center gap-0.5 rounded-md border border-input bg-background px-2 text-[10px] hover:bg-muted/50"
                >
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
