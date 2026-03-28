import { useRef, type PointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import AvatarCircle from '@/components/AvatarCircle'
import type { OrcamentoRow } from '@/api/crm'
import type { OrcamentoStatus } from '@/types/database'
import { cn } from '@/lib/utils'
import { formatOrcamentoDisplayNum } from '@/lib/orcamentoDisplayNum'

function fmt(dateStr: string) {
  const [, m, d] = dateStr.split('-')
  return `${d}/${m}`
}

function isOverdue(o: OrcamentoRow): boolean {
  if (!o.follow_up_at) return false
  return new Date(o.follow_up_at) < new Date(new Date().toDateString())
}

function isSoon(o: OrcamentoRow): boolean {
  if (!o.follow_up_at) return false
  const t = new Date(o.follow_up_at).getTime()
  const n = new Date(new Date().toDateString()).getTime()
  const diff = (t - n) / 86400000
  return diff >= 0 && diff <= 3
}

function CardMetaLine({ o }: { o: OrcamentoRow }) {
  const tax = o.tax_id?.trim()
  return (
    <div className="mt-2 space-y-0.5 border-t border-border/60 pt-1.5 font-mono text-[9px] leading-tight text-muted-foreground">
      <p>
        <span className="font-sans font-semibold text-foreground/80">Nº</span>{' '}
        {formatOrcamentoDisplayNum(o.display_num ?? 0)}
      </p>
      <p>taxId: {tax || '—'}</p>
    </div>
  )
}

export function KanbanCardBody({
  o,
  columnStatus,
  className,
  compact,
  showIds = true,
}: {
  o: OrcamentoRow
  columnStatus: OrcamentoStatus
  className?: string
  compact?: boolean
  /** Nº do cartão + taxId (desligar no overlay de arraste) */
  showIds?: boolean
}) {
  const nome = o.clientes?.nome ?? 'Cliente'
  const overdue = isOverdue(o)
  const soon = isSoon(o)

  return (
    <Card
      className={cn(
        'shadow-none border transition-all',
        columnStatus === 'perdido' && 'opacity-60',
        className
      )}
    >
      <CardContent className={cn('p-3', compact && 'p-2.5')}>
        <div className="flex items-start gap-2">
          <AvatarCircle name={nome} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold leading-snug">{nome}</p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{o.produto_descricao || '—'}</p>
            <Link
              to={`/clientes/${o.cliente_id}`}
              className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-medium text-brand-orange hover:underline"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3 w-3" />
              Cliente
            </Link>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">
            {o.valor ? `R$ ${Number(o.valor).toLocaleString('pt-BR')}` : '—'}
          </p>
          {overdue && (
            <span className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
              {o.follow_up_at ? fmt(o.follow_up_at) : ''} ⚠
            </span>
          )}
          {!overdue && soon && (
            <span className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
              Em breve
            </span>
          )}
          {!overdue && !soon && o.follow_up_at && (
            <span className="text-[10px] text-muted-foreground">{fmt(o.follow_up_at)}</span>
          )}
        </div>
        {showIds ? <CardMetaLine o={o} /> : null}
      </CardContent>
    </Card>
  )
}

type DraggableProps = {
  o: OrcamentoRow
  columnStatus: OrcamentoStatus
  saving?: boolean
  onOpenDetail: () => void
}

export function DraggableKanbanCard({ o, columnStatus, saving, onOpenDetail }: DraggableProps) {
  const clickRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: o.id,
    data: { type: 'card', orcamento: o },
    disabled: Boolean(saving),
  })

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  const l = listeners as { onPointerDown?: (e: PointerEvent<HTMLElement>) => void } & Record<
    string,
    unknown
  >

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        isDragging && 'opacity-40',
        saving && 'pointer-events-none opacity-60',
        !saving && 'cursor-grab active:cursor-grabbing'
      )}
      {...attributes}
      {...listeners}
      onPointerDown={(e) => {
        l.onPointerDown?.(e)
        clickRef.current = { x: e.clientX, y: e.clientY, t: Date.now() }
      }}
      onClick={(e) => {
        if (saving) return
        if ((e.target as HTMLElement).closest('a[href]')) return
        const p = clickRef.current
        clickRef.current = null
        if (!p) return
        const dt = Date.now() - p.t
        const d = Math.hypot(e.clientX - p.x, e.clientY - p.y)
        if (dt < 500 && d < 14) onOpenDetail()
      }}
    >
      <KanbanCardBody o={o} columnStatus={columnStatus} />
    </div>
  )
}
