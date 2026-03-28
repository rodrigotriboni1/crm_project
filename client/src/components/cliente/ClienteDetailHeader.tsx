import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { EntityActiveBadge } from '@/components/library'
import { clienteTipoLabel } from '@/hooks/useCrm'
import type { Cliente } from '@/types/database'

type Props = {
  cliente: Cliente
}

export default function ClienteDetailHeader({ cliente }: Props) {
  return (
    <div>
      <Link
        to="/clientes"
        className="mb-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Clientes
      </Link>
      <div className="flex flex-wrap items-start gap-2">
        <h2 className="text-lg font-semibold">{cliente.nome}</h2>
        {!cliente.ativo && <EntityActiveBadge active={false} inactiveLabel="Arquivado" className="mt-0.5" />}
      </div>
      <p className="text-xs text-muted-foreground">{clienteTipoLabel(cliente.tipo)}</p>
    </div>
  )
}
