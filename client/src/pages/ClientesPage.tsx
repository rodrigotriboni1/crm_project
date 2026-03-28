import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useClientes } from '@/hooks/useCrm'
import { Input } from '@/components/ui/input'
import {
  EmptyState,
  PageContainer,
  SectionCard,
  ToolbarRow,
} from '@/components/library'
import AvatarCircle from '@/components/AvatarCircle'
import NovoClienteDialog from '@/components/cliente/NovoClienteDialog'
import { formatFieldValueForDisplay, digitsOnly } from '@/lib/formatters'
import { clienteListPhoneDisplayField } from '@/lib/fields/clienteFormFields'
import { cn } from '@/lib/utils'

export default function ClientesPage() {
  const { user } = useAuth()
  const { data: clientes = [], isLoading } = useClientes(user)
  const [q, setQ] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return clientes
    return clientes.filter((c) => c.nome.toLowerCase().includes(s))
  }, [clientes, q])

  return (
    <PageContainer max="sm" className="space-y-4">
      <ToolbarRow
        start={
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 pl-9 text-sm"
              placeholder="Buscar por nome ou empresa…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        }
        end={<NovoClienteDialog user={user} open={dialogOpen} onOpenChange={setDialogOpen} />}
      />

      {isLoading ? (
        <div className="h-48 animate-pulse rounded-lg bg-muted/60" />
      ) : (
        <SectionCard contentClassName="p-2">
          {filtered.length === 0 ? (
            <EmptyState title="Nenhum cliente encontrado." />
          ) : (
            filtered.map((c) => (
              <Link
                key={c.id}
                to={`/clientes/${c.id}`}
                className="flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50"
              >
                <AvatarCircle name={c.nome} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.nome}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.whatsapp && digitsOnly(c.whatsapp)
                      ? formatFieldValueForDisplay(clienteListPhoneDisplayField, c.whatsapp)
                      : 'Sem telefone'}
                  </p>
                </div>
                <span
                  className={cn(
                    'flex-shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                    c.tipo === 'recompra'
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-blue-200 bg-blue-50 text-blue-700'
                  )}
                >
                  {c.tipo === 'recompra' ? 'Recompra' : 'Novo'}
                </span>
              </Link>
            ))
          )}
        </SectionCard>
      )}
    </PageContainer>
  )
}
