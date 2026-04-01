import { useRef, type KeyboardEvent, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { Draggable } from '@hello-pangea/dnd'
import { ExternalLink } from 'lucide-react'
import { SelectNative } from '@/components/ui/select-native'
import AssigneeAvatars from '@/components/ui/AssigneeAvatars'
import DeadlineTag from '@/components/ui/DeadlineTag'
import type { OrcamentoRow } from '@/api/crm'
import type { OrcamentoStatus } from '@/types/database'
import { cn } from '@/lib/utils'
import { digitsOnly, formatCpfCnpj } from '@/lib/formatters'
import { formatOrcamentoDisplayNum } from '@/lib/orcamentoDisplayNum'
import { ORCAMENTO_STATUS_ORDER, orcamentoStatusLabel } from '@/lib/orcamentoStatusUi'
import { KANBAN_STATUS_CARD_BAR } from '@/lib/kanbanPhaseUi'

function fmtShort(dateStr: string) {
  const [, m, d] = dateStr.split('-')
  return `${d}/${m}`
}

function cardIdLabel(displayNum: number) {
  return `#${formatOrcamentoDisplayNum(displayNum).slice(-4)}`
}

function initialsFromName(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (p.length === 0) return '?'
  if (p.length === 1) return p[0]!.slice(0, 2)
  return (p[0]![0] + p[p.length - 1]![0]).toUpperCase()
}

function formatDocLine(tax: string | null | undefined): string | null {
  const t = tax?.trim()
  if (!t) return null
  const d = digitsOnly(t)
  if (d.length === 11 || d.length === 14) return formatCpfCnpj(d)
  return null
}

function brl(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
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
  showIds?: boolean
}) {
  const nome = o.clientes?.nome ?? 'Cliente'
  const title = nome
  const segment = o.produtos?.categoria?.trim() || undefined
  const follow = o.follow_up_at
  const valorNum = Number(o.valor ?? 0)

  const doc = formatDocLine(o.tax_id)

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-[border-color] duration-150 hover:border-border-secondary',
        columnStatus === 'perdido' && 'opacity-70',
        className
      )}
    >
      <div className={cn('flex flex-col gap-[7px] p-2', compact && 'p-1.5')}>
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 flex-1 font-heading text-[13px] font-medium leading-snug text-foreground">{title}</p>
          <span className="shrink-0 font-heading text-[10px] text-muted-foreground">{cardIdLabel(o.display_num ?? 0)}</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center rounded-[20px] bg-phase-prospect-badge px-2 py-0.5 font-heading text-[10px] font-medium text-phase-prospect-text">
            {o.valor ? brl(valorNum) : '—'}
          </span>
          {follow ? (
            <DeadlineTag followUpAt={follow} label={fmtShort(follow)} />
          ) : null}
          {segment ? (
            <span className="inline-flex items-center rounded-[20px] bg-muted px-2 py-0.5 font-heading text-[10px] font-medium text-muted-foreground">
              {segment}
            </span>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <AssigneeAvatars assignees={[{ initials: initialsFromName(nome) }]} />
          <span className="shrink-0 font-heading text-[10px] text-muted-foreground">
            {follow ? fmtShort(follow) : '—'}
          </span>
        </div>

        <Link
          to={`/clientes/${o.cliente_id}`}
          className="inline-flex w-fit items-center gap-0.5 font-heading text-[10px] font-medium text-brand-primary hover:underline"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3 w-3" />
          Cliente
        </Link>

        {showIds && doc ? (
          <p className="border-t border-border-tertiary pt-1.5 font-heading text-[10px] text-muted-foreground">{doc}</p>
        ) : null}
      </div>
      <div className={cn('h-[3px] w-full shrink-0 rounded-b-lg', KANBAN_STATUS_CARD_BAR[columnStatus])} aria-hidden />
    </div>
  )
}

type DraggableProps = {
  o: OrcamentoRow
  columnStatus: OrcamentoStatus
  index: number
  saving?: boolean
  onOpenDetail: () => void
  dragDisabled?: boolean
  onChangeStatus?: (o: OrcamentoRow, status: OrcamentoStatus) => void
}

export function DraggableKanbanCard({
  o,
  columnStatus,
  index,
  saving,
  onOpenDetail,
  dragDisabled = false,
  onChangeStatus,
}: DraggableProps) {
  const clickRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const disabled = Boolean(saving) || dragDisabled
  const nome = o.clientes?.nome ?? 'Cliente'
  const ariaLabel = `${nome} — ${orcamentoStatusLabel(columnStatus)} — ${brl(Number(o.valor ?? 0))}`

  const onKeyActivate = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (!saving) onOpenDetail()
    }
  }

  return (
    <Draggable draggableId={o.id} index={index} isDragDisabled={disabled}>
      {(dragProvided, snapshot) => {
        const dh = dragProvided.dragHandleProps
        return (
        <div
          ref={dragProvided.innerRef}
          {...dragProvided.draggableProps}
          {...(dh ?? { role: 'button' as const, tabIndex: 0 })}
          style={{
            ...dragProvided.draggableProps.style,
          }}
          aria-label={ariaLabel}
          className={cn(
            snapshot.isDragging && 'opacity-60',
            saving && 'pointer-events-none opacity-60',
            !disabled && 'cursor-grab active:cursor-grabbing'
          )}
          onMouseDown={(e: MouseEvent<HTMLDivElement>) => {
            clickRef.current = { x: e.clientX, y: e.clientY, t: Date.now() }
          }}
          onKeyDown={onKeyActivate}
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
          {dragDisabled && onChangeStatus && (
            <div
              className="mt-1 border-t border-border px-1 pb-1 pt-2"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <label className="sr-only" htmlFor={`kanban-status-${o.id}`}>
                Mover etapa
              </label>
              <SelectNative
                id={`kanban-status-${o.id}`}
                className="h-10 w-full text-xs"
                value={o.status}
                onChange={(e) => onChangeStatus(o, e.target.value as OrcamentoStatus)}
                disabled={Boolean(saving)}
                aria-label="Mover para outra etapa"
              >
                {ORCAMENTO_STATUS_ORDER.map((st) => (
                  <option key={st} value={st}>
                    {orcamentoStatusLabel(st)}
                  </option>
                ))}
              </SelectNative>
            </div>
          )}
        </div>
        )
      }}
    </Draggable>
  )
}
