import { useEffect, useMemo, useState, type ElementType } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { Phone, Send, Moon, CheckCircle, XCircle, Search, LayoutGrid, Table2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useOrcamentos, ORCAMENTO_STATUS_ORDER } from '@/hooks/useCrm'
import { useOrcamentoStatusTransitions } from '@/hooks/useOrcamentoStatusTransitions'
import { filterOrcamentosByQuery } from '@/lib/orcamentosSearch'
import OrcamentoDetailModal from '@/components/OrcamentoDetailModal'
import KanbanColumn from '@/components/kanban/KanbanColumn'
import { KanbanCardBody } from '@/components/kanban/KanbanCard'
import KanbanTableView from '@/components/kanban/KanbanTableView'
import DormindoFollowUpDialog from '@/components/kanban/DormindoFollowUpDialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { groupOrcamentosByCliente } from '@/lib/kanbanGroup'
import type { OrcamentoRow } from '@/api/crm'
import type { OrcamentoStatus } from '@/types/database'

const VIEW_STORAGE_KEY = 'embala_kanban_view'

type ViewMode = 'kanban' | 'table'

const STATUS_ICON: Record<OrcamentoStatus, ElementType> = {
  novo_contato: Phone,
  orcamento_enviado: Send,
  dormindo: Moon,
  ganho: CheckCircle,
  perdido: XCircle,
}

const STATUS_COLOR: Record<OrcamentoStatus, string> = {
  novo_contato: 'text-blue-600',
  orcamento_enviado: 'text-sky-600',
  dormindo: 'text-amber-600',
  ganho: 'text-green-600',
  perdido: 'text-gray-400',
}

function resolveDropStatus(overId: string | undefined, rows: OrcamentoRow[]): OrcamentoStatus | null {
  if (!overId) return null
  if (ORCAMENTO_STATUS_ORDER.includes(overId as OrcamentoStatus)) {
    return overId as OrcamentoStatus
  }
  const row = rows.find((r) => r.id === overId)
  return row?.status ?? null
}

export default function KanbanPage() {
  const { user } = useAuth()
  const { data: rows = [], isLoading } = useOrcamentos(user)
  const {
    savingId,
    moveError,
    setMoveError,
    pendingDormindo,
    dormindoDialogError,
    attemptStatusChange,
    confirmDormindo,
    onDormindoDialogOpenChange,
  } = useOrcamentoStatusTransitions(user)

  const [modalId, setModalId] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [activeOrcamento, setActiveOrcamento] = useState<OrcamentoRow | null>(null)
  const [view, setView] = useState<ViewMode>(() => {
    try {
      return localStorage.getItem(VIEW_STORAGE_KEY) === 'table' ? 'table' : 'kanban'
    } catch {
      return 'kanban'
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, view)
    } catch {
      /* ignore */
    }
  }, [view])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const filteredRows = useMemo(() => filterOrcamentosByQuery(rows, q), [rows, q])

  /** Cartões do mesmo cliente agrupados em sequência (base para vários negócios por cliente). */
  const orderedByStatus = useMemo(() => {
    const m = new Map<OrcamentoStatus, OrcamentoRow[]>()
    for (const st of ORCAMENTO_STATUS_ORDER) m.set(st, [])
    for (const o of filteredRows) {
      const list = m.get(o.status)
      if (list) list.push(o)
    }
    for (const st of ORCAMENTO_STATUS_ORDER) {
      const col = m.get(st) ?? []
      m.set(st, groupOrcamentosByCliente(col).flatMap((g) => g.cards))
    }
    return m
  }, [filteredRows])

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id)
    const row = rows.find((r) => r.id === id)
    setActiveOrcamento(row ?? null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveOrcamento(null)
    const { active, over } = event
    if (!over) return

    const dragged = rows.find((r) => r.id === String(active.id))
    if (!dragged) return

    const newStatus = resolveDropStatus(String(over.id), rows)
    if (!newStatus || newStatus === dragged.status) return

    attemptStatusChange(dragged, newStatus)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-3 sm:px-4 sm:py-4 md:px-6">
        <div className="flex min-h-0 flex-1 gap-2 overflow-x-auto pb-1 sm:gap-3 xl:overflow-x-hidden">
          {ORCAMENTO_STATUS_ORDER.map((s) => (
            <div
              key={s}
              className="h-full min-h-[200px] min-w-[min(260px,calc(100vw-2.5rem))] shrink-0 animate-pulse rounded-lg bg-muted/60 sm:min-w-[220px] xl:min-w-0 xl:flex-1"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-3 sm:px-4 sm:py-4 md:px-6">
      <div className="mb-3 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full min-w-0 sm:max-w-md lg:max-w-xl lg:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Cliente, produto, CPF/CNPJ ou nº do cartão…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Filtrar cartões do Kanban"
          />
        </div>
        <div className="flex shrink-0 gap-1 rounded-lg border border-[#d4d2c8] bg-muted/20 p-0.5">
          <Button
            type="button"
            variant={view === 'kanban' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 gap-1.5 px-3 text-xs"
            onClick={() => setView('kanban')}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Kanban
          </Button>
          <Button
            type="button"
            variant={view === 'table' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 gap-1.5 px-3 text-xs"
            onClick={() => setView('table')}
          >
            <Table2 className="h-3.5 w-3.5" />
            Tabela
          </Button>
        </div>
      </div>

      {moveError && (
        <div className="mb-3 shrink-0 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {moveError}
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => setMoveError(null)}
          >
            Fechar
          </button>
        </div>
      )}

      {view === 'table' ? (
        <KanbanTableView
          rows={filteredRows}
          savingId={savingId}
          editableStatus
          onStatusChange={attemptStatusChange}
          onOpenDetail={(id) => setModalId(id)}
        />
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex min-h-0 flex-1 gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] sm:gap-3 xl:overflow-x-hidden xl:pb-0">
            {ORCAMENTO_STATUS_ORDER.map((status) => {
              const col = orderedByStatus.get(status) ?? []
              const StatusIcon = STATUS_ICON[status]
              return (
                <KanbanColumn
                  key={status}
                  status={status}
                  items={col}
                  StatusIcon={StatusIcon}
                  statusColorClass={STATUS_COLOR[status]}
                  savingId={savingId}
                  onOpenDetail={setModalId}
                />
              )
            })}
          </div>

          <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1)' }}>
            {activeOrcamento ? (
              <div className="w-[min(100vw-2rem,280px)] rotate-1 cursor-grabbing shadow-lg">
                <KanbanCardBody
                  o={activeOrcamento}
                  columnStatus={activeOrcamento.status}
                  showIds={false}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <OrcamentoDetailModal
        user={user}
        orcamentoId={modalId}
        open={modalId !== null}
        onOpenChange={(op) => !op && setModalId(null)}
      />

      <DormindoFollowUpDialog
        open={pendingDormindo !== null}
        orcamento={pendingDormindo}
        onOpenChange={onDormindoDialogOpenChange}
        onConfirm={(date) => void confirmDormindo(date)}
        isPending={Boolean(savingId)}
        error={dormindoDialogError}
      />
    </div>
  )
}
