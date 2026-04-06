import type { Dispatch, SetStateAction } from 'react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { User } from '@supabase/supabase-js'
import { Filter, LayoutGrid, Layers, Search, Table2 } from 'lucide-react'
import KanbanSavedFiltersSection from '@/components/kanban/KanbanSavedFiltersSection'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SelectNative } from '@/components/ui/select-native'
import type { KanbanAdvancedFilters, KanbanFollowUpFilter, KanbanProdutoOrigemFilter } from '@/lib/kanbanFilters'
import { KANBAN_SEM_CATEGORIA_VALUE } from '@/lib/kanbanFilters'
import { KANBAN_GROUP_MODE_LABELS, type KanbanGroupMode } from '@/lib/kanbanGroup'

type ViewMode = 'kanban' | 'table'

type Props = {
  user: User | null
  organizationId: string | null
  q: string
  setQ: (v: string) => void
  filtersOpen: boolean
  setFiltersOpen: (v: boolean) => void
  advanced: KanbanAdvancedFilters
  setAdvanced: Dispatch<SetStateAction<KanbanAdvancedFilters>>
  onClearFilters: () => void
  groupMode: KanbanGroupMode
  setGroupMode: (m: KanbanGroupMode) => void
  categoryOptions: string[]
  view: ViewMode
  setView: (v: ViewMode) => void
  activeAdvancedCount: number
}

const FOLLOW_OPTIONS: { value: KanbanFollowUpFilter; label: string }[] = [
  { value: 'any', label: 'Qualquer data' },
  { value: 'none', label: 'Sem follow-up' },
  { value: 'overdue', label: 'Follow-up atrasado' },
  { value: 'today', label: 'Follow-up hoje' },
  { value: 'next7', label: 'Próximos 7 dias' },
  { value: 'next30', label: 'Próximos 30 dias' },
]

const ORIGEM_OPTIONS: { value: KanbanProdutoOrigemFilter; label: string }[] = [
  { value: 'todos', label: 'Catálogo e personalizado' },
  { value: 'catalogo', label: 'Só catálogo' },
  { value: 'personalizado', label: 'Só texto livre' },
]

const GROUP_OPTIONS = (Object.keys(KANBAN_GROUP_MODE_LABELS) as KanbanGroupMode[]).map((k) => ({
  value: k,
  label: KANBAN_GROUP_MODE_LABELS[k],
}))

export default function KanbanFilterControls({
  user,
  organizationId,
  q,
  setQ,
  filtersOpen,
  setFiltersOpen,
  advanced,
  setAdvanced,
  onClearFilters,
  groupMode,
  setGroupMode,
  categoryOptions,
  view,
  setView,
  activeAdvancedCount,
}: Props) {
  const hasTextOrAdvanced = q.trim() !== '' || activeAdvancedCount > 0
  const filtersButtonRef = useRef<HTMLButtonElement>(null)
  const filtersPanelRef = useRef<HTMLDivElement>(null)
  const [panelRect, setPanelRect] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)

  const updatePanelPosition = useCallback(() => {
    const btn = filtersButtonRef.current
    if (!btn) return
    const r = btn.getBoundingClientRect()
    const margin = 12
    const maxWidth = 576
    const width = Math.min(maxWidth, window.innerWidth - margin * 2)
    let left = r.right - width
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin))
    const top = r.bottom + 6
    setPanelRect({ top, left, width })
  }, [])

  useLayoutEffect(() => {
    if (!filtersOpen) {
      setPanelRect(null)
      return
    }
    updatePanelPosition()
    const ro = new ResizeObserver(updatePanelPosition)
    if (filtersButtonRef.current) ro.observe(filtersButtonRef.current)
    window.addEventListener('resize', updatePanelPosition)
    document.addEventListener('scroll', updatePanelPosition, true)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', updatePanelPosition)
      document.removeEventListener('scroll', updatePanelPosition, true)
    }
  }, [filtersOpen, updatePanelPosition])

  useEffect(() => {
    if (!filtersOpen) return
    const onPointerDown = (e: MouseEvent | PointerEvent) => {
      const t = e.target as Node
      if (filtersButtonRef.current?.contains(t)) return
      if (filtersPanelRef.current?.contains(t)) return
      setFiltersOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [filtersOpen, setFiltersOpen])

  useEffect(() => {
    if (!filtersOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFiltersOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [filtersOpen, setFiltersOpen])

  const filtersPanel =
    filtersOpen && panelRect
      ? createPortal(
          <div
            ref={filtersPanelRef}
            id="kanban-advanced-filters-panel"
            role="dialog"
            aria-modal="false"
            aria-labelledby="kanban-filters-panel-title"
            className="fixed z-[100] max-h-[min(85vh,40rem)] overflow-y-auto rounded-lg border border-border bg-card p-4 shadow-xl dark:shadow-black/40"
            style={{
              top: panelRect.top,
              left: panelRect.left,
              width: panelRect.width,
            }}
          >
            <h2 id="kanban-filters-panel-title" className="sr-only">
              Filtros avançados do funil
            </h2>
            <KanbanSavedFiltersSection
              user={user}
              organizationId={organizationId}
              q={q}
              setQ={setQ}
              advanced={advanced}
              setAdvanced={setAdvanced}
              onApplied={() => setFiltersOpen(false)}
            />
            <p className="mb-3 font-heading text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Campos do CRM
            </p>
            <div
              className="rounded-lg border border-border bg-muted/15 p-3"
              role="region"
              aria-label="Filtros por campos do orçamento"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Valor mín. (R$)</span>
                  <Input
                    className="h-9 text-sm"
                    inputMode="decimal"
                    placeholder="Ex.: 1000"
                    value={advanced.valorMin}
                    onChange={(e) => setAdvanced((p) => ({ ...p, valorMin: e.target.value }))}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Valor máx. (R$)</span>
                  <Input
                    className="h-9 text-sm"
                    inputMode="decimal"
                    placeholder="Ex.: 50000"
                    value={advanced.valorMax}
                    onChange={(e) => setAdvanced((p) => ({ ...p, valorMax: e.target.value }))}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Data do orçamento — de</span>
                  <Input
                    className="h-9 text-sm"
                    type="date"
                    value={advanced.dataOrcDe}
                    onChange={(e) => setAdvanced((p) => ({ ...p, dataOrcDe: e.target.value }))}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Data do orçamento — até</span>
                  <Input
                    className="h-9 text-sm"
                    type="date"
                    value={advanced.dataOrcAte}
                    onChange={(e) => setAdvanced((p) => ({ ...p, dataOrcAte: e.target.value }))}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Follow-up</span>
                  <SelectNative
                    className="h-9 text-xs"
                    value={advanced.followUp}
                    onChange={(e) =>
                      setAdvanced((p) => ({ ...p, followUp: e.target.value as KanbanFollowUpFilter }))
                    }
                  >
                    {FOLLOW_OPTIONS.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </SelectNative>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Origem do produto</span>
                  <SelectNative
                    className="h-9 text-xs"
                    value={advanced.produtoOrigem}
                    onChange={(e) =>
                      setAdvanced((p) => ({
                        ...p,
                        produtoOrigem: e.target.value as KanbanProdutoOrigemFilter,
                      }))
                    }
                  >
                    {ORIGEM_OPTIONS.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </SelectNative>
                </label>
                <label className="flex flex-col gap-1 sm:col-span-2">
                  <span className="text-xs text-muted-foreground">Categoria (catálogo)</span>
                  <SelectNative
                    className="h-9 text-xs"
                    value={advanced.categoria}
                    onChange={(e) => setAdvanced((p) => ({ ...p, categoria: e.target.value }))}
                    aria-label="Filtrar por categoria do produto"
                  >
                    <option value="">Todas as categorias</option>
                    <option value={KANBAN_SEM_CATEGORIA_VALUE}>Sem categoria</option>
                    {categoryOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </SelectNative>
                </label>
                <label className="flex flex-col gap-1 sm:col-span-2">
                  <span className="text-xs text-muted-foreground">Motivo perdido (contém)</span>
                  <Input
                    className="h-9 text-sm"
                    placeholder="Texto no motivo quando status é Perdido"
                    value={advanced.lostReasonContains}
                    onChange={(e) => setAdvanced((p) => ({ ...p, lostReasonContains: e.target.value }))}
                  />
                </label>
              </div>
            </div>
            {hasTextOrAdvanced && (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={onClearFilters}
                >
                  Limpar filtros
                </Button>
              </div>
            )}
          </div>,
          document.body
        )
      : null

  return (
    <div className="shrink-0 border-b border-border bg-[var(--color-background)] pb-3 pt-0 dark:bg-[var(--color-background)]">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 w-full flex-[1_1_240px] sm:w-auto sm:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-8 pl-9 text-sm"
            placeholder="Cliente, produto, CPF/CNPJ, categoria, SKU ou nº do cartão…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Busca textual no funil"
          />
        </div>

        <div className="flex min-w-0 flex-[1_1_auto] items-center gap-1.5 sm:max-w-[min(100%,20rem)]">
          <Layers className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <SelectNative
            className="h-8 min-w-0 flex-1 py-0 text-xs"
            value={groupMode}
            onChange={(e) => setGroupMode(e.target.value as KanbanGroupMode)}
            aria-label="Agrupar cartões na coluna"
          >
            {GROUP_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectNative>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:ml-auto">
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

          <Button
            ref={filtersButtonRef}
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 border-border px-3 text-xs"
            onClick={() => setFiltersOpen(!filtersOpen)}
            aria-haspopup="dialog"
            aria-expanded={filtersOpen}
            aria-controls={filtersOpen ? 'kanban-advanced-filters-panel' : undefined}
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros
            {activeAdvancedCount > 0 ? (
              <span className="ml-0.5 rounded-full bg-brand-orange/20 px-1.5 font-heading text-[10px] font-semibold text-brand-orange">
                {activeAdvancedCount}
              </span>
            ) : null}
          </Button>
        </div>
      </div>

      {filtersPanel}
    </div>
  )
}
