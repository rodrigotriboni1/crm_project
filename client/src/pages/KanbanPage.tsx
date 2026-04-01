import { useEffect, useMemo, useState } from 'react'
import { Search, LayoutGrid, Table2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useOrganization } from '@/contexts/OrganizationContext'
import { useGenericAssistantDock } from '@/contexts/AssistantDockContext'
import { useOrcamentosKanban, ORCAMENTO_STATUS_ORDER } from '@/hooks/useCrm'
import { useOrcamentoStatusTransitions } from '@/hooks/useOrcamentoStatusTransitions'
import { filterOrcamentosByQuery } from '@/lib/orcamentosSearch'
import KanbanCardModal from '@/components/kanban/KanbanCardModal'
import KanbanBoard from '@/components/kanban/KanbanBoard'
import KanbanTableView from '@/components/kanban/KanbanTableView'
import DormindoFollowUpDialog from '@/components/kanban/DormindoFollowUpDialog'
import PerdidoLostReasonDialog from '@/components/kanban/PerdidoLostReasonDialog'
import OrcamentoDetailModal from '@/components/OrcamentoDetailModal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { groupOrcamentosByCliente } from '@/lib/kanbanGroup'
import { KANBAN_VIEW_KEY } from '@/lib/storageKeys'
import { useViewportMaxMd } from '@/hooks/useViewportMaxMd'
import { useKanbanDragEnd } from '@/components/kanban/useKanbanDrag'
import type { OrcamentoRow } from '@/api/crm'
import type { OrcamentoStatus } from '@/types/database'

type ViewMode = 'kanban' | 'table'

const EMPTY_KANBAN_ROWS: OrcamentoRow[] = []

export default function KanbanPage() {
  useGenericAssistantDock('Kanban')
  const isMobileKanban = useViewportMaxMd()
  const { user } = useAuth()
  const { activeOrganizationId } = useOrganization()
  const {
    data: kanbanLoad,
    isLoading,
    isError: kanbanError,
    error: kanbanQueryError,
  } = useOrcamentosKanban(user, activeOrganizationId)
  const rows = useMemo(() => {
    if (!kanbanLoad) return EMPTY_KANBAN_ROWS
    return kanbanLoad.rows
  }, [kanbanLoad])
  const kanbanTruncated = kanbanLoad?.truncated === true
  const {
    savingId,
    moveError,
    setMoveError,
    pendingDormindo,
    dormindoDialogError,
    pendingPerdido,
    perdidoDialogError,
    attemptStatusChange,
    confirmDormindo,
    onDormindoDialogOpenChange,
    confirmPerdido,
    onPerdidoDialogOpenChange,
  } = useOrcamentoStatusTransitions(user)

  const [modalId, setModalId] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [groupByCliente, setGroupByCliente] = useState(true)
  const [view, setView] = useState<ViewMode>(() => {
    try {
      return localStorage.getItem(KANBAN_VIEW_KEY) === 'table' ? 'table' : 'kanban'
    } catch {
      return 'kanban'
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(KANBAN_VIEW_KEY, view)
    } catch {
      /* ignore */
    }
  }, [view])

  const filteredRows = useMemo(() => filterOrcamentosByQuery(rows, q), [rows, q])

  const orderedByStatus = useMemo(() => {
    const m = new Map<OrcamentoStatus, OrcamentoRow[]>()
    for (const st of ORCAMENTO_STATUS_ORDER) m.set(st, [])
    for (const o of filteredRows) {
      const list = m.get(o.status)
      if (list) list.push(o)
    }
    if (groupByCliente) {
      for (const st of ORCAMENTO_STATUS_ORDER) {
        const col = m.get(st) ?? []
        m.set(st, groupOrcamentosByCliente(col).flatMap((g) => g.cards))
      }
    }
    return m
  }, [filteredRows, groupByCliente])

  const onDragEnd = useKanbanDragEnd(rows, attemptStatusChange)

  if (kanbanError) {
    const msg = kanbanQueryError instanceof Error ? kanbanQueryError.message : 'Erro ao carregar orçamentos.'
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-3 sm:px-4 sm:py-4 md:px-6">
        <div
          className="mb-3 shrink-0 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {msg}
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-3 sm:px-4 sm:py-4 md:px-6">
        <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-1">
          {ORCAMENTO_STATUS_ORDER.map((s) => (
            <div
              key={s}
              className="h-full min-h-[200px] w-[260px] shrink-0 animate-pulse rounded-lg bg-muted/60"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-3 sm:px-4 sm:py-4 md:px-6">
      {moveError && (
        <div className="mb-3 shrink-0 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {moveError}
          <button type="button" className="ml-2 underline" onClick={() => setMoveError(null)}>
            Fechar
          </button>
        </div>
      )}

      {view === 'table' ? (
        <>
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
            <div className="flex shrink-0 gap-1 rounded-lg border border-border bg-muted/20 p-0.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-3 text-xs"
                onClick={() => setView('kanban')}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Kanban
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 gap-1.5 px-3 text-xs"
                onClick={() => setView('table')}
              >
                <Table2 className="h-3.5 w-3.5" />
                Tabela
              </Button>
            </div>
          </div>

          {kanbanTruncated && (
            <div
              className="mb-3 shrink-0 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100"
              role="status"
            >
              A mostrar os orçamentos mais recentes (limite de segurança). Para ver ou filtrar todos, use{' '}
              <Link to="/orcamentos" className="font-medium underline underline-offset-2">
                Orçamentos
              </Link>
              .
            </div>
          )}

          <KanbanTableView
            rows={filteredRows}
            savingId={savingId}
            editableStatus
            onStatusChange={attemptStatusChange}
            onOpenDetail={(id) => setModalId(id)}
          />

          <OrcamentoDetailModal
            user={user}
            orcamentoId={modalId}
            open={modalId !== null}
            onOpenChange={(op) => !op && setModalId(null)}
          />
        </>
      ) : (
        <>
          <KanbanBoard
            user={user}
            orderedByStatus={orderedByStatus}
            savingId={savingId}
            attemptStatusChange={attemptStatusChange}
            onOpenDetail={(id) => setModalId(id)}
            isMobileKanban={isMobileKanban}
            onDragEnd={onDragEnd}
            q={q}
            setQ={setQ}
            groupByCliente={groupByCliente}
            setGroupByCliente={setGroupByCliente}
            view={view}
            setView={setView}
            kanbanTruncated={kanbanTruncated}
          />

          <KanbanCardModal
            user={user}
            orcamentoId={modalId}
            open={modalId !== null}
            onOpenChange={(op) => !op && setModalId(null)}
          />
        </>
      )}

      <DormindoFollowUpDialog
        open={pendingDormindo !== null}
        orcamento={pendingDormindo}
        onOpenChange={onDormindoDialogOpenChange}
        onConfirm={(date) => void confirmDormindo(date)}
        isPending={Boolean(savingId)}
        error={dormindoDialogError}
      />

      <PerdidoLostReasonDialog
        open={pendingPerdido !== null}
        orcamento={pendingPerdido}
        onOpenChange={onPerdidoDialogOpenChange}
        onConfirm={(reason) => void confirmPerdido(reason)}
        isPending={Boolean(savingId)}
        error={perdidoDialogError}
      />
    </div>
  )
}
