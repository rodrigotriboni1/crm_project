import { Droppable } from '@hello-pangea/dnd'
import { orcamentoStatusLabel } from '@/hooks/useCrm'
import { DraggableKanbanCard } from '@/components/kanban/KanbanCard'
import type { OrcamentoRow } from '@/api/crm'
import type { OrcamentoStatus } from '@/types/database'
import { cn } from '@/lib/utils'
import { KANBAN_STATUS_DOT, KANBAN_STATUS_HEADER_BG } from '@/lib/kanbanPhaseUi'

type Props = {
  status: OrcamentoStatus
  items: OrcamentoRow[]
  savingId: string | null
  onOpenDetail: (id: string) => void
  dragDisabled?: boolean
  onChangeStatus?: (o: OrcamentoRow, status: OrcamentoStatus) => void
  onAddCard: (status: OrcamentoStatus) => void
}

export default function KanbanColumn({
  status,
  items,
  savingId,
  onOpenDetail,
  dragDisabled = false,
  onChangeStatus,
  onAddCard,
}: Props) {
  const label = orcamentoStatusLabel(status)
  const count = items.length

  return (
    <div className="flex w-[260px] shrink-0 flex-col">
      <div
        className={cn(
          'flex items-center justify-between gap-2 rounded-t-lg px-2 py-2',
          KANBAN_STATUS_HEADER_BG[status]
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn('h-2 w-2 shrink-0 rounded-full', KANBAN_STATUS_DOT[status])} aria-hidden />
          <span className="truncate font-heading text-xs font-medium text-foreground">{label}</span>
        </div>
        <span
          className="shrink-0 rounded-full bg-card/90 px-2 py-0.5 font-heading text-[10px] font-semibold tabular-nums text-foreground shadow-sm dark:bg-card/50"
          aria-label={`${count} cartões`}
        >
          {count}
        </span>
      </div>

      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'flex min-h-[120px] flex-1 flex-col gap-[7px] overflow-y-auto rounded-b-lg border-[0.5px] border-border-tertiary border-t-0 bg-background-secondary p-2',
              snapshot.isDraggingOver && 'ring-1 ring-brand-primary/25'
            )}
          >
            {items.length === 0 ? (
              <p className="py-4 text-center font-heading text-xs text-muted-foreground">
                Nenhum orçamento nesta etapa.
              </p>
            ) : (
              items.map((o, index) => (
                <DraggableKanbanCard
                  key={o.id}
                  o={o}
                  columnStatus={status}
                  index={index}
                  saving={savingId === o.id}
                  onOpenDetail={() => onOpenDetail(o.id)}
                  dragDisabled={dragDisabled}
                  onChangeStatus={onChangeStatus}
                />
              ))
            )}
            {provided.placeholder}
            <button
              type="button"
              className="mt-auto flex w-full items-center justify-center rounded-md border-[0.5px] border-dashed border-border-secondary py-2 font-heading text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => onAddCard(status)}
            >
              + Adicionar card
            </button>
          </div>
        )}
      </Droppable>
    </div>
  )
}
