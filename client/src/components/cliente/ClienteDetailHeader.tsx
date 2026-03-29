import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { EntityActiveBadge, PageHeader } from '@/components/library'
import { clienteTipoLabel } from '@/hooks/useCrm'
import type { Cliente } from '@/types/database'

type Props = {
  cliente: Cliente
}

export default function ClienteDetailHeader({ cliente }: Props) {
  return (
    <div className="space-y-3">
      <Link
        to="/clientes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Clientes
      </Link>
      <PageHeader
        className="border-b-0 pb-0"
        title={cliente.nome}
        description={clienteTipoLabel(cliente.tipo)}
        actions={
          !cliente.ativo ? (
            <EntityActiveBadge active={false} inactiveLabel="Arquivado" />
          ) : undefined
        }
      />
    </div>
  )
}
