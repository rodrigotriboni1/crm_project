import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
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
        className="mb-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Clientes
      </Link>
      <h2 className="text-lg font-semibold">{cliente.nome}</h2>
      <p className="text-xs text-muted-foreground">{clienteTipoLabel(cliente.tipo)}</p>
    </div>
  )
}
