import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useGenericAssistantDock } from '@/contexts/AssistantDockContext'
import { useClientes } from '@/hooks/useCrm'
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
  clientesListKpis,
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
  useGenericAssistantDock('Clientes')
  const { data: clientes = [], isLoading } = useClientes(user)
  const [q, setQ] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [tipoFilter, setTipoFilter] = useState<ClienteTipoFilter>('todos')
  const [phoneFilter, setPhoneFilter] = useState<ClientePhoneFilter>('todos')
  const [archiveFilter, setArchiveFilter] = useState<ClienteArchiveFilter>('ativos')
  const [sort, setSort] = useState<ClienteSort>('nome_asc')

  const kpis = useMemo(() => clientesListKpis(clientes), [clientes])

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

  return (
    <PageContainer max="lg" className="space-y-4">
      <ListPageKpiGrid
        columnsClassName="sm:grid-cols-2 lg:grid-cols-5"
        items={[
          { label: 'Ativos', value: kpis.ativos, valueClassName: 'text-foreground' },
          { label: 'Arquivados', value: kpis.arquivados, valueClassName: 'text-muted-foreground' },
          { label: 'Recompra (ativos)', value: kpis.recompras, valueClassName: 'text-green-700' },
          {
            label: 'Com telefone',
            value: (
              <>
                {kpis.comTel}
                <span className="ml-1 text-xs font-normal text-muted-foreground">({kpis.pctTel}%)</span>
              </>
            ),
          },
          { label: 'Sem contacto 30d', value: kpis.semContato30, valueClassName: 'text-amber-800' },
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
            <Button type="button" variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              Importar planilha
            </Button>
            <NovoClienteDialog user={user} open={dialogOpen} onOpenChange={setDialogOpen} />
          </>
        }
      />

      <ImportarClientesDialog user={user} open={importOpen} onOpenChange={setImportOpen} />

      {isLoading ? (
        <div className="h-48 animate-pulse rounded-lg bg-muted/60" />
      ) : (
        <SectionCard contentClassName="p-2">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Users className="size-10" />}
              title={clientes.length === 0 ? 'Ainda não há clientes' : 'Nenhum cliente corresponde aos filtros'}
              description={
                clientes.length === 0
                  ? 'Adicione o primeiro contacto ou importe uma lista a partir de uma planilha Excel.'
                  : 'Ajuste a pesquisa ou os filtros para ver mais resultados.'
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
            filtered.map((c) => (
              <Link
                key={c.id}
                to={`/clientes/${c.id}`}
                className="flex cursor-pointer items-start gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50"
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
            ))
          )}
        </SectionCard>
      )}
    </PageContainer>
  )
}
