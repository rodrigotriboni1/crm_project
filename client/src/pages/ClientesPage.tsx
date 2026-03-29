import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useOrganization } from '@/contexts/OrganizationContext'
import { useGenericAssistantDock } from '@/contexts/AssistantDockContext'
import { useBulkPatchClientes, useClientes, useClientesKpis } from '@/hooks/useCrm'
import { Button } from '@/components/ui/button'
import {
  EmptyState,
  EntityActiveBadge,
  ListPageKpiGrid,
  PageContainer,
  SearchField,
  SectionCard,
  ToolbarRow,
} from '@/components/library'
import AvatarCircle from '@/components/AvatarCircle'
import NovoClienteDialog from '@/components/cliente/NovoClienteDialog'
import ImportarClientesDialog from '@/components/cliente/ImportarClientesDialog'
import {
  clientesBulkAtivoPatches,
  filterAndSortClientes,
  clientePhoneLine,
  clienteTaxDisplay,
  formatUltimoContatoLabel,
  type ClienteArchiveFilter,
  type ClientePhoneFilter,
  type ClienteSort,
  type ClienteTipoFilter,
} from '@/lib/clienteListHelpers'
import { SelectNative } from '@/components/ui/select-native'
import { cn } from '@/lib/utils'

export default function ClientesPage() {
  const { user } = useAuth()
  const { activeOrganizationId } = useOrganization()
  useGenericAssistantDock('Clientes')
  const {
    data: clientes = [],
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useClientes(user, activeOrganizationId)
  const { data: kpis } = useClientesKpis(user, activeOrganizationId)
  const bulkAtivo = useBulkPatchClientes(user, activeOrganizationId)
  const selectAllRef = useRef<HTMLInputElement>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [tipoFilter, setTipoFilter] = useState<ClienteTipoFilter>('todos')
  const [phoneFilter, setPhoneFilter] = useState<ClientePhoneFilter>('todos')
  const [archiveFilter, setArchiveFilter] = useState<ClienteArchiveFilter>('ativos')
  const [sort, setSort] = useState<ClienteSort>('nome_asc')

  const kpisDisplay = kpis ?? {
    ativos: 0,
    arquivados: 0,
    recompras: 0,
    comTel: 0,
    semContato30: 0,
    pctTel: 0,
  }

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

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((c) => selectedIds.has(c.id))
  const someFilteredSelected =
    filtered.length > 0 && filtered.some((c) => selectedIds.has(c.id)) && !allFilteredSelected

  useEffect(() => {
    const el = selectAllRef.current
    if (el) el.indeterminate = someFilteredSelected
  }, [someFilteredSelected, allFilteredSelected])

  const toActivate = useMemo(
    () => clientesBulkAtivoPatches(selectedIds, clientes, true),
    [selectedIds, clientes]
  )
  const toArchive = useMemo(
    () => clientesBulkAtivoPatches(selectedIds, clientes, false),
    [selectedIds, clientes]
  )

  const toggleSelect = (id: string) => {
    setBulkError(null)
    setSelectedIds((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const selectAllFiltered = () => {
    setBulkError(null)
    setSelectedIds((prev) => {
      const n = new Set(prev)
      for (const c of filtered) n.add(c.id)
      return n
    })
  }

  const clearFilteredSelection = () => {
    setBulkError(null)
    setSelectedIds((prev) => {
      const n = new Set(prev)
      for (const c of filtered) n.delete(c.id)
      return n
    })
  }

  const clearAllSelection = () => {
    setBulkError(null)
    setSelectedIds(new Set())
  }

  const runBulkAtivo = (ativo: boolean) => {
    const items = clientesBulkAtivoPatches(selectedIds, clientes, ativo)
    if (items.length === 0) return
    setBulkError(null)
    bulkAtivo.mutate(items, {
      onSuccess: () => setSelectedIds(new Set()),
      onError: (e) => {
        setBulkError(e instanceof Error ? e.message : 'Não foi possível atualizar.')
      },
    })
  }

  return (
    <PageContainer max="lg" className="space-y-4">
      <ListPageKpiGrid
        columnsClassName="sm:grid-cols-2 lg:grid-cols-5"
        items={[
          { label: 'Ativos', value: kpisDisplay.ativos, valueClassName: 'text-foreground' },
          { label: 'Arquivados', value: kpisDisplay.arquivados, valueClassName: 'text-muted-foreground' },
          { label: 'Recompra (ativos)', value: kpisDisplay.recompras, valueClassName: 'text-green-700' },
          {
            label: 'Com telefone',
            value: (
              <>
                {kpisDisplay.comTel}
                <span className="ml-1 text-xs font-normal text-muted-foreground">({kpisDisplay.pctTel}%)</span>
              </>
            ),
          },
          { label: 'Sem contacto 30d', value: kpisDisplay.semContato30, valueClassName: 'text-amber-800' },
        ]}
      />

      <ToolbarRow
        start={
          <div className="space-y-2">
            <SearchField
              className="max-w-xl"
              value={q}
              onChange={setQ}
              placeholder="Nome, CPF/CNPJ, telefone ou produtos habituais…"
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
        }
        end={
          <>
            <Button type="button" variant="outline" size="sm" asChild>
              <Link to="/clientes/planilha">Vista em planilha</Link>
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              Importar planilha
            </Button>
            <NovoClienteDialog user={user} open={dialogOpen} onOpenChange={setDialogOpen} />
          </>
        }
      />

      {q.trim() && hasNextPage && (
        <p className="text-xs text-muted-foreground">
          A pesquisa aplica-se apenas aos clientes já carregados. Use «Carregar mais» abaixo para alargar o âmbito.
        </p>
      )}

      <ImportarClientesDialog user={user} open={importOpen} onOpenChange={setImportOpen} />

      {selectedIds.size > 0 && (
        <div
          className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-brand-surface/50 px-3 py-2"
          role="region"
          aria-label="Acções em massa no estado da ficha"
        >
          <span className="text-sm text-brand-dark">
            {selectedIds.size} selecionado{selectedIds.size !== 1 ? 's' : ''}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={bulkAtivo.isPending || toActivate.length === 0}
            title={toActivate.length === 0 ? 'Os selecionados já estão ativos' : undefined}
            onClick={() => runBulkAtivo(true)}
          >
            {bulkAtivo.isPending ? 'A atualizar…' : `Ativar${toActivate.length ? ` (${toActivate.length})` : ''}`}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={bulkAtivo.isPending || toArchive.length === 0}
            title={toArchive.length === 0 ? 'Os selecionados já estão arquivados' : undefined}
            onClick={() => runBulkAtivo(false)}
          >
            {bulkAtivo.isPending ? 'A atualizar…' : `Arquivar${toArchive.length ? ` (${toArchive.length})` : ''}`}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={clearAllSelection} disabled={bulkAtivo.isPending}>
            Limpar seleção
          </Button>
        </div>
      )}

      {bulkError && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {bulkError}
        </p>
      )}

      {isLoading ? (
        <div className="h-48 animate-pulse rounded-lg bg-muted/60" />
      ) : (
        <SectionCard contentClassName="p-2">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Users className="size-10" />}
              title={
                clientes.length === 0 && !hasNextPage
                  ? 'Ainda não há clientes'
                  : 'Nenhum cliente corresponde aos filtros'
              }
              description={
                clientes.length === 0 && !hasNextPage
                  ? 'Adicione o primeiro contacto ou importe uma lista a partir de uma planilha Excel.'
                  : clientes.length === 0 && hasNextPage
                    ? 'Carregue mais clientes para poder filtrar e pesquisar no conjunto completo.'
                    : 'Ajuste a pesquisa ou os filtros, ou carregue mais clientes se ainda não carregou todos.'
              }
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button type="button" size="sm" onClick={() => setDialogOpen(true)}>
                    Novo cliente
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                    Importar planilha
                  </Button>
                </div>
              }
            />
          ) : (
            <>
              {filtered.length > 0 && (
                <div className="mb-1 flex items-center gap-2 border-b border-border px-2 pb-2">
                  <input
                    ref={selectAllRef}
                    id="clientes-select-all-filtered"
                    type="checkbox"
                    className="size-4 shrink-0 rounded border border-border accent-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                    checked={allFilteredSelected}
                    onChange={() => {
                      if (allFilteredSelected) clearFilteredSelection()
                      else selectAllFiltered()
                    }}
                    aria-label={`Selecionar todos os ${filtered.length} resultados do filtro actual`}
                  />
                  <label
                    htmlFor="clientes-select-all-filtered"
                    className="cursor-pointer select-none text-xs text-muted-foreground"
                  >
                    Todos neste filtro ({filtered.length})
                  </label>
                </div>
              )}
              {filtered.map((c) => (
                <div
                  key={c.id}
                  className="flex items-start gap-2 rounded-lg p-2 transition-colors hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    className="mt-2.5 size-4 shrink-0 rounded border border-border accent-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                    checked={selectedIds.has(c.id)}
                    onChange={() => toggleSelect(c.id)}
                    aria-label={`Selecionar ${c.nome}`}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Link
                    to={`/clientes/${c.id}`}
                    className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-md p-1 pr-2"
                  >
                    <AvatarCircle name={c.nome} size="md" className="mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="truncate text-sm font-medium">{c.nome}</p>
                      <p className="truncate text-xs text-muted-foreground">{clientePhoneLine(c)}</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                        {clienteTaxDisplay(c) && (
                          <span className="font-mono text-foreground/80">{clienteTaxDisplay(c)}</span>
                        )}
                        {clienteTaxDisplay(c) && <span aria-hidden>·</span>}
                        <span>{formatUltimoContatoLabel(c.ultimo_contato)}</span>
                      </div>
                    </div>
                    <div className="mt-0.5 flex shrink-0 flex-col items-end gap-1">
                      <EntityActiveBadge active={c.ativo} activeLabel="Ativo" inactiveLabel="Arquivado" />
                      <span
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[11px] font-medium',
                          c.tipo === 'recompra'
                            ? 'border-green-200 bg-green-50 text-green-700'
                            : 'border-blue-200 bg-blue-50 text-blue-700'
                        )}
                      >
                        {c.tipo === 'recompra' ? 'Recompra' : 'Novo'}
                      </span>
                    </div>
                  </Link>
                </div>
              ))}
            </>
          )}
        </SectionCard>
      )}

      {hasNextPage && (
        <div className="flex flex-col items-center gap-2 py-2">
          <p className="text-center text-xs text-muted-foreground">
            Mostrando {clientes.length} cliente(s) carregado(s). Há mais na sua base.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
          >
            {isFetchingNextPage ? 'A carregar…' : 'Carregar mais clientes'}
          </Button>
        </div>
      )}
    </PageContainer>
  )
}
