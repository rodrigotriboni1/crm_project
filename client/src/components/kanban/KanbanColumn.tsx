import type { ElementType } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { orcamentoStatusLabel } from '@/hooks/useCrm'
import { STATUS_COLUMN_TOP } from '@/components/StatusBadge'
import { DraggableKanbanCard } from '@/components/kanban/KanbanCard'
import type { OrcamentoRow } from '@/api/crm'
import type { OrcamentoStatus } from '@/types/database'
import { cn } from '@/lib/utils'

function brl(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

type Props = {
  status: OrcamentoStatus
  items: OrcamentoRow[]
  StatusIcon: ElementType
  statusColorClass: string
  savingId: string | null
  onOpenDetail: (id: string) => void
  dragDisabled?: boolean
  onChangeStatus?: (o: OrcamentoRow, status: OrcamentoStatus) => void
}

export default function KanbanColumn({
  status,
  items,
  StatusIcon,
  statusColorClass,
  savingId,
  onOpenDetail,
  dragDisabled = false,
  onChangeStatus,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { type: 'column', status },
  })

  const totalValor = items.reduce((sum, o) => sum + Number(o.valor ?? 0), 0)
  const count = items.length

  return (
    <div
      className={cn(
        'flex min-h-0 min-w-[min(260px,calc(100vw-2.5rem))] shrink-0 flex-col rounded-lg border border-border border-t-4 bg-card/80 sm:min-w-[220px] xl:min-w-0 xl:max-w-none xl:flex-1',
        STATUS_COLUMN_TOP[status]
      )}
    >
      <div className="shrink-0 space-y-1 px-2 pb-2 pt-3">
        <div className={cn('flex items-center gap-1.5 text-xs font-medium', statusColorClass)}>
          <StatusIcon className="h-3.5 w-3.5" />
          {orcamentoStatusLabel(status)}
        </div>
        <p className="text-[10px] leading-snug text-muted-foreground">
          {count} {count === 1 ? 'oportunidade' : 'oportunidades'} · {brl(totalValor)}
        </p>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'min-h-[120px] flex-1 space-y-2 overflow-y-auto p-2',
          isOver && 'rounded-md bg-brand-orange/5 ring-1 ring-brand-orange/25'
        )}
      >
        {items.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Nenhum orçamento nesta etapa.</p>
        ) : (
          items.map((o) => (
            <DraggableKanbanCard
              key={o.id}
              o={o}
              columnStatus={status}
              saving={savingId === o.id}
              onOpenDetail={() => onOpenDetail(o.id)}
              dragDisabled={dragDisabled}
              onChangeStatus={onChangeStatus}
            />
          ))
        )}
      </div>
    </div>
  )
}
