import type { Dispatch, SetStateAction } from 'react'
import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useKanbanSavedFilters } from '@/hooks/useCrm'
import { buildKanbanSavedFilterPayload, parseKanbanSavedFilterPayload } from '@/lib/kanbanSavedFilterPayload'
import type { KanbanAdvancedFilters } from '@/lib/kanbanFilters'

type Props = {
  user: User | null
  organizationId: string | null
  q: string
  setQ: (v: string) => void
  advanced: KanbanAdvancedFilters
  setAdvanced: Dispatch<SetStateAction<KanbanAdvancedFilters>>
  onApplied?: () => void
}

export default function KanbanSavedFiltersSection({
  user,
  organizationId,
  q,
  setQ,
  advanced,
  setAdvanced,
  onApplied,
}: Props) {
  const { data: saved = [], isLoading, createMut, deleteMut } = useKanbanSavedFilters(user, organizationId)
  const [saveName, setSaveName] = useState('')
  const [saveShared, setSaveShared] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [applyError, setApplyError] = useState<string | null>(null)

  const uid = user?.id
  const canUse = Boolean(uid && organizationId)

  const minePrivate = saved.filter((s) => s.created_by === uid && !s.is_shared)
  const mineShared = saved.filter((s) => s.created_by === uid && s.is_shared)
  const teamShared = saved.filter((s) => s.is_shared && s.created_by !== uid)

  function applyRow(id: string) {
    setApplyError(null)
    const row = saved.find((s) => s.id === id)
    if (!row) return
    const parsed = parseKanbanSavedFilterPayload(row.filters)
    if (!parsed) {
      setApplyError('Preset corrompido ou desatualizado.')
      return
    }
    setQ(parsed.q)
    setAdvanced(parsed.advanced)
    onApplied?.()
  }

  async function onSave() {
    setSaveError(null)
    const name = saveName.trim()
    if (!name) {
      setSaveError('Indique um nome para o filtro.')
      return
    }
    if (!canUse) return
    try {
      await createMut.mutateAsync({
        name,
        is_shared: saveShared,
        filters: buildKanbanSavedFilterPayload(q, advanced),
      })
      setSaveName('')
      setSaveShared(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Não foi possível guardar.'
      setSaveError(msg)
    }
  }

  return (
    <div className="mb-4 border-b border-border pb-4">
      <p className="mb-2 font-heading text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Filtros guardados
      </p>

      {!canUse ? (
        <p className="text-xs text-muted-foreground">Inicie sessão com uma organização para usar filtros guardados.</p>
      ) : isLoading ? (
        <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          A carregar…
        </div>
      ) : saved.length === 0 ? (
        <p className="mb-3 text-xs text-muted-foreground">Ainda não há filtros guardados nesta organização.</p>
      ) : (
        <ul className="mb-3 max-h-44 space-y-1 overflow-y-auto rounded-md border border-border/80 bg-muted/10 p-1.5 text-xs">
          {minePrivate.length > 0 ? (
            <li className="px-1 py-0.5 font-medium text-muted-foreground">Privados</li>
          ) : null}
          {minePrivate.map((s) => (
            <li key={s.id} className="flex items-stretch gap-1">
              <button
                type="button"
                className="min-w-0 flex-1 rounded px-2 py-1.5 text-left hover:bg-muted/80"
                onClick={() => applyRow(s.id)}
              >
                {s.name}
              </button>
              <button
                type="button"
                className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                aria-label={`Eliminar filtro ${s.name}`}
                onClick={() => void deleteMut.mutateAsync(s.id)}
                disabled={deleteMut.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
          {mineShared.length > 0 ? (
            <li className="mt-2 px-1 py-0.5 font-medium text-muted-foreground">Meus · visíveis para a equipa</li>
          ) : null}
          {mineShared.map((s) => (
            <li key={s.id} className="flex items-stretch gap-1">
              <button
                type="button"
                className="min-w-0 flex-1 rounded px-2 py-1.5 text-left hover:bg-muted/80"
                onClick={() => applyRow(s.id)}
              >
                {s.name}
              </button>
              <button
                type="button"
                className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                aria-label={`Eliminar filtro ${s.name}`}
                onClick={() => void deleteMut.mutateAsync(s.id)}
                disabled={deleteMut.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
          {teamShared.length > 0 ? (
            <li className="mt-2 px-1 py-0.5 font-medium text-muted-foreground">Da organização</li>
          ) : null}
          {teamShared.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="w-full rounded px-2 py-1.5 text-left hover:bg-muted/80"
                onClick={() => applyRow(s.id)}
              >
                {s.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {applyError ? <p className="mb-2 text-xs text-destructive">{applyError}</p> : null}

      {canUse ? (
        <div className="space-y-2 rounded-lg border border-dashed border-border/90 bg-muted/5 p-3">
          <p className="text-xs font-medium text-foreground">Guardar filtro atual</p>
          <Input
            className="h-9 text-sm"
            placeholder="Nome do filtro (ex.: Grandes contas)"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            disabled={createMut.isPending}
            aria-label="Nome do filtro a guardar"
          />
          <label className="flex cursor-pointer items-start gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              className="mt-0.5 rounded border-border"
              checked={saveShared}
              onChange={(e) => setSaveShared(e.target.checked)}
              disabled={createMut.isPending}
            />
            <span>Partilhar com toda a organização (todos os membros podem aplicar este filtro).</span>
          </label>
          <Button
            type="button"
            size="sm"
            className="h-8 w-full text-xs sm:w-auto"
            onClick={() => void onSave()}
            disabled={createMut.isPending}
          >
            {createMut.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                A guardar…
              </>
            ) : (
              'Guardar filtro atual'
            )}
          </Button>
          {saveError ? <p className="text-xs text-destructive">{saveError}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
