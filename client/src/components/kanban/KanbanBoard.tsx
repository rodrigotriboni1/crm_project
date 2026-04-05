import { useState } from 'react'
import { DragDropContext, type DropResult } from '@hello-pangea/dnd'
import type { User } from '@supabase/supabase-js'
import KanbanColumn from '@/components/kanban/KanbanColumn'
import NovoOrcamentoDialog from '@/components/NovoOrcamentoDialog'
import { ORCAMENTO_STATUS_ORDER } from '@/hooks/useCrm'
import type { OrcamentoRow } from '@/api/crm'
import type { OrcamentoStatus } from '@/types/database'

type Props = {
  user: User | null
  orderedByStatus: Map<OrcamentoStatus, OrcamentoRow[]>
  savingId: string | null
  attemptStatusChange: (o: OrcamentoRow, status: OrcamentoStatus) => void
  onOpenDetail: (id: string) => void
  isMobileKanban: boolean
  onDragEnd: (result: DropResult) => void
}

export default function KanbanBoard({
  user,
  orderedByStatus,
  savingId,
  attemptStatusChange,
  onOpenDetail,
  isMobileKanban,
  onDragEnd,
}: Props) {
  const [novoOpen, setNovoOpen] = useState(false)
  const [novoInitialStatus, setNovoInitialStatus] = useState<OrcamentoStatus>('novo_contato')

  const openNovo = (status?: OrcamentoStatus) => {
    setNovoInitialStatus(status ?? 'novo_contato')
    setNovoOpen(true)
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="mt-2 flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch]">
          {ORCAMENTO_STATUS_ORDER.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              items={orderedByStatus.get(status) ?? []}
              savingId={savingId}
              onOpenDetail={onOpenDetail}
              dragDisabled={isMobileKanban}
              onChangeStatus={attemptStatusChange}
              onAddCard={(st) => openNovo(st)}
            />
          ))}
        </div>
      </DragDropContext>

      <NovoOrcamentoDialog
        user={user}
        open={novoOpen}
        onOpenChange={setNovoOpen}
        initialStatus={novoInitialStatus}
      />
    </div>
  )
}
