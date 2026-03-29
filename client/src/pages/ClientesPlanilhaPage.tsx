import { lazy, Suspense, useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Sheet } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useGenericAssistantDock } from '@/contexts/AssistantDockContext'
import { useBulkPatchClientes, useClientes } from '@/hooks/useCrm'
import { Button } from '@/components/ui/button'
import { PageContainer, SearchField, ToolbarRow } from '@/components/library'
import { SelectNative } from '@/components/ui/select-native'
import {
  filterAndSortClientes,
  type ClienteArchiveFilter,
  type ClientePhoneFilter,
  type ClienteSort,
  type ClienteTipoFilter,
} from '@/lib/clienteListHelpers'
import type { ClienteListItem, ClienteUpdate } from '@/types/database'

const ClientesGlideGrid = lazy(() => import('@/components/cliente/ClientesGlideGrid'))

function mergedForValidation(base: ClienteListItem, draft: ClienteUpdate): ClienteListItem {
  return { ...base, ...draft, ultimo_contato: base.ultimo_contato }
}

export default function ClientesPlanilhaPage() {
  const { user } = useAuth()
  useGenericAssistantDock('Clientes · Planilha')
  const { data: clientes = [], isLoading } = useClientes(user)
  const bulk = useBulkPatchClientes(user)

  const [q, setQ] = useState('')
  const [tipoFilter, setTipoFilter] = useState<ClienteTipoFilter>('todos')
  const [phoneFilter, setPhoneFilter] = useState<ClientePhoneFilter>('todos')
  const [archiveFilter, setArchiveFilter] = useState<ClienteArchiveFilter>('todos')
  const [sort, setSort] = useState<ClienteSort>('nome_asc')
  const [drafts, setDrafts] = useState<Record<string, ClienteUpdate>>({})
  const [saveError, setSaveError] = useState<string | null>(null)

  const byId = useMemo(() => new Map(clientes.map((c) => [c.id, c] as const)), [clientes])

  const filtered = useMemo(
    () =>
      filterAndSortClientes(clientes, {
        q,
        tipo: tipoFilter,
        phone: phoneFilter,
        sort,
        archive: archiveFilter,
      }),
    [clientes, q, tipoFilter, phoneFilter, sort, archiveFilter]
  )

  const mergePatch = useCallback((id: string, fragment: ClienteUpdate) => {
    setSaveError(null)
    setDrafts((d) => {
      const prev = d[id] ?? {}
      return { ...d, [id]: { ...prev, ...fragment } }
    })
  }, [])

  const dirtyCount = Object.keys(drafts).length

  const handleSave = () => {
    setSaveError(null)
    const items: { id: string; patch: ClienteUpdate }[] = []
    for (const [id, patch] of Object.entries(drafts)) {
      const base = byId.get(id)
      if (!base) continue
      const merged = mergedForValidation(base, patch)
      if (!merged.nome.trim()) {
        setSaveError('Cada cliente precisa de um nome. Corrija a linha antes de guardar.')
        return
      }
      items.push({ id, patch })
    }
    if (items.length === 0) return
    bulk.mutate(items, {
      onSuccess: () => setDrafts({}),
      onError: (e) => {
        setSaveError(e instanceof Error ? e.message : 'Não foi possível guardar.')
      },
    })
  }

  const handleDiscard = () => {
    setSaveError(null)
    setDrafts({})
  }

  return (
    <PageContainer max="full" className="space-y-4">
      <ToolbarRow
        start={
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="ghost" size="sm" className="gap-1.5 px-2" asChild>
              <Link to="/clientes">
                <ArrowLeft className="size-4" />
                Lista
              </Link>
            </Button>
            <div className="flex items-center gap-2 border-l border-[#d4d2c8] pl-3">
              <Sheet className="size-5 text-brand-mid" aria-hidden />
              <h1 className="font-sans text-base font-semibold text-brand-dark">Clientes em planilha</h1>
            </div>
          </div>
        }
        end={
          <div className="flex flex-wrap items-center gap-2">
            {dirtyCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {dirtyCount} ficha{dirtyCount !== 1 ? 's' : ''} alterada{dirtyCount !== 1 ? 's' : ''}
              </span>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDiscard}
              disabled={dirtyCount === 0 || bulk.isPending}
            >
              Descartar
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={dirtyCount === 0 || bulk.isPending}>
              {bulk.isPending ? 'A guardar…' : 'Guardar alterações'}
            </Button>
          </div>
        }
      />

      {saveError && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {saveError}
        </p>
      )}

      <div className="space-y-2">
        <SearchField
          className="max-w-xl"
          value={q}
          onChange={setQ}
          placeholder="Filtrar por nome, CPF/CNPJ, telefone…"
        />
        <div className="flex flex-wrap items-center gap-2">
          <SelectNative
            className="h-9 w-auto min-w-[8rem] text-xs"
            value={archiveFilter}
            onChange={(e) => setArchiveFilter(e.target.value as ClienteArchiveFilter)}
            aria-label="Fichas ativas ou arquivadas"
          >
            <option value="ativos">Só ativos</option>
            <option value="arquivados">Só arquivados</option>
            <option value="todos">Todos</option>
          </SelectNative>
          <SelectNative
            className="h-9 w-auto min-w-[7.5rem] text-xs"
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value as ClienteTipoFilter)}
            aria-label="Filtrar por tipo"
          >
            <option value="todos">Todos os tipos</option>
            <option value="novo">Só novos</option>
            <option value="recompra">Só recompra</option>
          </SelectNative>
          <SelectNative
            className="h-9 w-auto min-w-[7.5rem] text-xs"
            value={phoneFilter}
            onChange={(e) => setPhoneFilter(e.target.value as ClientePhoneFilter)}
            aria-label="Filtrar por telefone"
          >
            <option value="todos">Telefone: todos</option>
            <option value="com">Com telefone</option>
            <option value="sem">Sem telefone</option>
          </SelectNative>
          <SelectNative
            className="h-9 w-auto min-w-[10rem] text-xs"
            value={sort}
            onChange={(e) => setSort(e.target.value as ClienteSort)}
            aria-label="Ordenar"
          >
            <option value="nome_asc">Nome (A–Z)</option>
            <option value="ultimo_desc">Último contacto</option>
            <option value="criado_desc">Mais recentes</option>
          </SelectNative>
        </div>
      </div>

      {isLoading ? (
        <div className="h-[min(70vh,720px)] min-h-[360px] animate-pulse rounded-md bg-muted/60" />
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum cliente com estes filtros. Ajuste a pesquisa ou volte à lista.</p>
      ) : (
        <Suspense
          fallback={<div className="h-[min(70vh,720px)] min-h-[360px] animate-pulse rounded-md bg-muted/60" />}
        >
          <ClientesGlideGrid rows={filtered} drafts={drafts} onMergePatch={mergePatch} />
        </Suspense>
      )}
    </PageContainer>
  )
}
