import { useCallback } from 'react'
import type { DropResult } from '@hello-pangea/dnd'
import type { OrcamentoRow } from '@/api/crm'
import type { OrcamentoStatus } from '@/types/database'
import { ORCAMENTO_STATUS_ORDER } from '@/lib/orcamentoStatusUi'

/**
 * onDragEnd para @hello-pangea/dnd: só altera fase quando o destino é outra coluna.
 * Reutiliza `attemptStatusChange` (diálogos Dormindo/Perdido inalterados).
 */
export function useKanbanDragEnd(
  rows: OrcamentoRow[],
  onMove: (o: OrcamentoRow, newStatus: OrcamentoStatus) => void
) {
  return useCallback(
    (result: DropResult) => {
      const { destination, source, draggableId } = result
      if (!destination) return
      if (destination.droppableId === source.droppableId && destination.index === source.index) return

      const destStatus = destination.droppableId as OrcamentoStatus
      if (!ORCAMENTO_STATUS_ORDER.includes(destStatus)) return

      const dragged = rows.find((r) => r.id === draggableId)
      if (!dragged || dragged.status === destStatus) return

      onMove(dragged, destStatus)
    },
    [rows, onMove]
  )
}
