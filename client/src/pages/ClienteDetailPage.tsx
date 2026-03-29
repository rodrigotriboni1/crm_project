import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useGenericAssistantDock } from '@/contexts/AssistantDockContext'
import {
  useCliente,
  useInteracoes,
  useOrcamentosByCliente,
  useUpdateCliente,
  useCreateInteracao,
  useCreateOrcamento,
  useProdutos,
} from '@/hooks/useCrm'
import ClienteDetailHeader from '@/components/cliente/ClienteDetailHeader'
import ClienteDadosCard from '@/components/cliente/ClienteDadosCard'
import ClienteOrcamentosSection from '@/components/cliente/ClienteOrcamentosSection'
import ClienteInteracoesSection from '@/components/cliente/ClienteInteracoesSection'

export default function ClienteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  useGenericAssistantDock('Cliente')
  const { data: cliente, isLoading } = useCliente(user, id)
  const interacoesQ = useInteracoes(user, id)
  const interacoes = useMemo(() => interacoesQ.data?.pages.flat() ?? [], [interacoesQ.data])
  const { data: orcamentos = [] } = useOrcamentosByCliente(user, id)
  const update = useUpdateCliente(user, id ?? '')
  const createInt = useCreateInteracao(user, id ?? '')
  const createOrc = useCreateOrcamento(user)
  const { data: produtosCatalogo = [] } = useProdutos(user, { ativosApenas: true })

  if (!id) return <p className="px-4 py-4 text-sm text-red-700 sm:p-6">Cliente inválido.</p>
  if (isLoading) {
    return (
      <div className="space-y-4 px-4 py-4 sm:p-6">
        <div className="h-6 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-48 animate-pulse rounded-lg bg-muted/60" />
      </div>
    )
  }
  if (!cliente) return <p className="px-4 py-4 text-sm text-muted-foreground sm:p-6">Cliente não encontrado.</p>

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-4 sm:p-6">
      <ClienteDetailHeader cliente={cliente} />
      <ClienteDadosCard cliente={cliente} update={update} />
      <ClienteOrcamentosSection
        clienteId={id}
        orcamentos={orcamentos}
        produtosCatalogo={produtosCatalogo}
        createOrc={createOrc}
      />
      <ClienteInteracoesSection
        interacoes={interacoes}
        createInt={createInt}
        hasMore={Boolean(interacoesQ.hasNextPage)}
        loadingMore={interacoesQ.isFetchingNextPage}
        onLoadMore={() => void interacoesQ.fetchNextPage()}
      />
    </div>
  )
}
