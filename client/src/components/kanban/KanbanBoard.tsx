import { useState } from 'react'
import { DragDropContext, type DropResult } from '@hello-pangea/dnd'
import { Filter, LayoutGrid, Layers, Plus, Search, Table2 } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { Link } from 'react-router-dom'
import KanbanColumn from '@/components/kanban/KanbanColumn'
import NovoOrcamentoDialog from '@/components/NovoOrcamentoDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ORCAMENTO_STATUS_ORDER } from '@/hooks/useCrm'
import type { OrcamentoRow } from '@/api/crm'
import type { OrcamentoStatus } from '@/types/database'
import { cn } from '@/lib/utils'

type ViewMode = 'kanban' | 'table'

type Props = {
  user: User | null
  orderedByStatus: Map<OrcamentoStatus, OrcamentoRow[]>
  savingId: string | null
  attemptStatusChange: (o: OrcamentoRow, status: OrcamentoStatus) => void
  onOpenDetail: (id: string) => void
  isMobileKanban: boolean
  onDragEnd: (result: DropResult) => void
  q: string
  setQ: (q: string) => void
  groupByCliente: boolean
  setGroupByCliente: (v: boolean) => void
  view: ViewMode
  setView: (v: ViewMode) => void
  kanbanTruncated: boolean
}

export default function KanbanBoard({
  user,
  orderedByStatus,
  savingId,
  attemptStatusChange,
  onOpenDetail,
  isMobileKanban,
  onDragEnd,
  q,
  setQ,
  groupByCliente,
  setGroupByCliente,
  view,
  setView,
  kanbanTruncated,
}: Props) {
  const [filterOpen, setFilterOpen] = useState(true)
  const [novoOpen, setNovoOpen] = useState(false)
  const [novoInitialStatus, setNovoInitialStatus] = useState<OrcamentoStatus>('novo_contato')

  const openNovo = (status?: OrcamentoStatus) => {
    setNovoInitialStatus(status ?? 'novo_contato')
    setNovoOpen(true)
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="sticky top-0 z-20 shrink-0 border-b border-border bg-[var(--color-background)] pb-3 pt-0 dark:bg-[var(--color-background)]">
        <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-border px-3 text-xs"
              onClick={() => setFilterOpen((v) => !v)}
              aria-expanded={filterOpen}
            >
              <Filter className="h-3.5 w-3.5" />
              Filtrar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn('h-8 gap-1.5 border-border px-3 text-xs', groupByCliente && 'bg-muted')}
              onClick={() => setGroupByCliente(!groupByCliente)}
              aria-pressed={groupByCliente}
            >
              <Layers className="h-3.5 w-3.5" />
              Agrupar
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1.5 bg-brand-primary px-3 text-xs text-white hover:bg-brand-primary/90"
              onClick={() => openNovo()}
            >
              <Plus className="h-3.5 w-3.5" />
              Nova oportunidade
            </Button>
            <div className="flex gap-1 rounded-lg border border-border bg-muted/20 p-0.5">
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

        {filterOpen && (
          <div className="relative mt-3 w-full min-w-0 max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Cliente, produto, CPF/CNPJ ou nº do cartão…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Filtrar cartões do Kanban"
            />
          </div>
        )}
      </div>

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
