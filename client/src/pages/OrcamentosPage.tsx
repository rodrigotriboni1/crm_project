import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  useOrcamentos,
  useClientes,
  orcamentoStatusLabel,
  ORCAMENTO_STATUS_ORDER,
} from '@/hooks/useCrm'
import { filterOrcamentosByQuery } from '@/lib/orcamentosSearch'
import OrcamentoDetailModal from '@/components/OrcamentoDetailModal'
import KanbanTableView from '@/components/kanban/KanbanTableView'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { OrcamentoStatus } from '@/types/database'

type FilterKey = 'todos' | OrcamentoStatus

export default function OrcamentosPage() {
  const { user } = useAuth()
  const { data: orcamentos = [], isLoading } = useOrcamentos(user)
  const { data: clientes = [] } = useClientes(user)

  const [filter, setFilter] = useState<FilterKey>('todos')
  const [modalId, setModalId] = useState<string | null>(null)
  const [q, setQ] = useState('')

  const filteredByStatus = useMemo(() => {
    if (filter === 'todos') return orcamentos
    return orcamentos.filter((o) => o.status === filter)
  }, [orcamentos, filter])

  const displayRows = useMemo(
    () => filterOrcamentosByQuery(filteredByStatus, q),
    [filteredByStatus, q]
  )

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 px-4 py-4 sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {(['todos', ...ORCAMENTO_STATUS_ORDER] as FilterKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                filter === key
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
              )}
            >
              {key === 'todos' ? 'Todos' : orcamentoStatusLabel(key)}
              {key !== 'todos' && (
                <span className="ml-1.5 opacity-60">
                  {orcamentos.filter((o) => o.status === key).length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative w-full min-w-0 max-w-md flex-1 lg:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Cliente, produto, CPF/CNPJ ou nº do cartão…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Buscar orçamentos"
          />
        </div>
      </div>

      {clientes.length === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Cadastre um cliente antes de criar orçamentos. Use <strong>Novo orçamento</strong> na barra
          lateral ou{' '}
          <Link className="font-medium underline underline-offset-2" to="/clientes">
            vá para Clientes
          </Link>
          .
        </div>
      )}

      {isLoading ? (
        <div className="h-56 animate-pulse rounded-lg bg-muted/60" />
      ) : (
        <KanbanTableView
          rows={displayRows}
          savingId={null}
          editableStatus={false}
          onOpenDetail={(id) => setModalId(id)}
        />
      )}

      <OrcamentoDetailModal
        user={user}
        orcamentoId={modalId}
        open={modalId !== null}
        onOpenChange={(op) => !op && setModalId(null)}
      />
    </div>
  )
}
