import { useMemo, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useOrganization } from '@/contexts/OrganizationContext'
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
import ClienteQuickActionBar from '@/components/cliente/ClienteQuickActionBar'

export default function ClienteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { activeOrganizationId } = useOrganization()
  useGenericAssistantDock('Cliente')
  const { data: cliente, isLoading } = useCliente(user, activeOrganizationId, id)
  const interacoesQ = useInteracoes(user, activeOrganizationId, id)
  const interacoes = useMemo(() => interacoesQ.data?.pages.flat() ?? [], [interacoesQ.data])
  const { data: orcamentos = [] } = useOrcamentosByCliente(user, activeOrganizationId, id)
  const update = useUpdateCliente(user, activeOrganizationId, id ?? '')
  const createInt = useCreateInteracao(user, activeOrganizationId, id ?? '')
  const createOrc = useCreateOrcamento(user, activeOrganizationId)
  const { data: produtosCatalogo = [] } = useProdutos(user, activeOrganizationId, { ativosApenas: true })
  const [registerContatoOpen, setRegisterContatoOpen] = useState(false)

  const onRegistrarContato = useCallback(() => {
    document.getElementById('historico-contatos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setRegisterContatoOpen(true)
  }, [])

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
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-4 max-md:pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))] sm:p-6">
      <ClienteDetailHeader cliente={cliente} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className="min-w-0 space-y-5">
          <ClienteDadosCard cliente={cliente} update={update} />
          <ClienteOrcamentosSection
            clienteId={id}
            orcamentos={orcamentos}
            produtosCatalogo={produtosCatalogo}
            createOrc={createOrc}
          />
        </div>
        <div className="min-w-0 lg:sticky lg:top-4 lg:self-start">
          <ClienteInteracoesSection
            interacoes={interacoes}
            createInt={createInt}
            hasMore={Boolean(interacoesQ.hasNextPage)}
            loadingMore={interacoesQ.isFetchingNextPage}
            onLoadMore={() => void interacoesQ.fetchNextPage()}
            registerDialogOpen={registerContatoOpen}
            onRegisterDialogOpenChange={setRegisterContatoOpen}
          />
        </div>
      </div>
      <ClienteQuickActionBar
        telefone={cliente.telefone}
        whatsapp={cliente.whatsapp}
        onRegistrarContato={onRegistrarContato}
      />
    </div>
  )
}
