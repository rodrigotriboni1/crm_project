import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useOrganization } from '@/contexts/OrganizationContext'
import { useGenericAssistantDock } from '@/contexts/AssistantDockContext'
import { useOrcamentosKanban, ORCAMENTO_STATUS_ORDER } from '@/hooks/useCrm'
import { useOrcamentoStatusTransitions } from '@/hooks/useOrcamentoStatusTransitions'
import { filterOrcamentosByQuery } from '@/lib/orcamentosSearch'
import {
  applyKanbanAdvancedFilters,
  collectKanbanCategoriaOptions,
  countActiveKanbanAdvancedFilters,
  defaultKanbanAdvancedFilters,
} from '@/lib/kanbanFilters'
import { applyKanbanGrouping, type KanbanGroupMode } from '@/lib/kanbanGroup'
import KanbanCardModal from '@/components/kanban/KanbanCardModal'
import KanbanBoard from '@/components/kanban/KanbanBoard'
import KanbanFilterControls from '@/components/kanban/KanbanFilterControls'
import KanbanTableView from '@/components/kanban/KanbanTableView'
import DormindoFollowUpDialog from '@/components/kanban/DormindoFollowUpDialog'
import PerdidoLostReasonDialog from '@/components/kanban/PerdidoLostReasonDialog'
import OrcamentoDetailModal from '@/components/OrcamentoDetailModal'
import { KANBAN_VIEW_KEY } from '@/lib/storageKeys'
import { useViewportMaxMd } from '@/hooks/useViewportMaxMd'
import { useKanbanDragEnd } from '@/components/kanban/useKanbanDrag'
import type { OrcamentoRow } from '@/api/crm'
import type { OrcamentoStatus } from '@/types/database'
import { cnAlertError } from '@/lib/supabaseDataErrors'
import { cn } from '@/lib/utils'

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
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [advancedFilters, setAdvancedFilters] = useState(defaultKanbanAdvancedFilters)
  const [groupMode, setGroupMode] = useState<KanbanGroupMode>('cliente')
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

  const todayIso = new Date().toISOString().slice(0, 10)

  const categoryOptions = useMemo(() => collectKanbanCategoriaOptions(rows), [rows])

  const filteredRows = useMemo(() => {
    const byText = filterOrcamentosByQuery(rows, q)
    return applyKanbanAdvancedFilters(byText, advancedFilters, todayIso)
  }, [rows, q, advancedFilters, todayIso])

  const orderedByStatus = useMemo(() => {
    const m = new Map<OrcamentoStatus, OrcamentoRow[]>()
    for (const st of ORCAMENTO_STATUS_ORDER) m.set(st, [])
    for (const o of filteredRows) {
      const list = m.get(o.status)
      if (list) list.push(o)
    }
    for (const st of ORCAMENTO_STATUS_ORDER) {
      const col = m.get(st) ?? []
      m.set(st, applyKanbanGrouping(groupMode, col))
    }
    return m
  }, [filteredRows, groupMode])

  const tableRows = useMemo(() => {
    const out: OrcamentoRow[] = []
    for (const st of ORCAMENTO_STATUS_ORDER) {
      out.push(...(orderedByStatus.get(st) ?? []))
    }
    return out
  }, [orderedByStatus])

  const activeAdvancedCount = useMemo(
    () => countActiveKanbanAdvancedFilters(advancedFilters),
    [advancedFilters]
  )

  const clearAllFilters = () => {
    setQ('')
    setAdvancedFilters(defaultKanbanAdvancedFilters())
  }

  const onDragEnd = useKanbanDragEnd(rows, attemptStatusChange)

  if (kanbanError) {
    const msg = kanbanQueryError instanceof Error ? kanbanQueryError.message : 'Erro ao carregar orçamentos.'
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-3 sm:px-4 sm:py-4 md:px-6">
        <div className={cn(cnAlertError, 'mb-3 shrink-0')} role="alert">
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
        <div className={cn(cnAlertError, 'mb-3 shrink-0')}>
          {moveError}
          <button type="button" className="ml-2 underline" onClick={() => setMoveError(null)}>
            Fechar
          </button>
        </div>
      )}

      <KanbanFilterControls
        user={user}
        organizationId={activeOrganizationId}
        q={q}
        setQ={setQ}
        filtersOpen={filtersOpen}
        setFiltersOpen={setFiltersOpen}
        advanced={advancedFilters}
        setAdvanced={setAdvancedFilters}
        onClearFilters={clearAllFilters}
        groupMode={groupMode}
        setGroupMode={setGroupMode}
        categoryOptions={categoryOptions}
        view={view}
        setView={setView}
        activeAdvancedCount={activeAdvancedCount}
      />

      {kanbanTruncated && (
        <div
          className="mb-2 mt-2 shrink-0 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100"
          role="status"
        >
          A mostrar os orçamentos mais recentes (limite de segurança). Para ver ou filtrar todos, use{' '}
          <Link to="/orcamentos" className="font-medium underline underline-offset-2">
            Orçamentos
          </Link>
          .
        </div>
      )}

      {view === 'table' ? (
        <>
          <KanbanTableView
            rows={tableRows}
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
