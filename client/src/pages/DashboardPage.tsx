import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, ChevronRight, LayoutGrid, Package } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useOrganization } from '@/contexts/OrganizationContext'
import { useDashboard } from '@/hooks/useCrm'
import { FOLLOW_UP_ALERT_WINDOW_DAYS } from '@/api/crm'
import { Card, CardContent } from '@/components/ui/card'
import OrcamentoDetailModal from '@/components/OrcamentoDetailModal'
import AvatarCircle from '@/components/AvatarCircle'
import { useRegisterAssistantDock } from '@/contexts/AssistantDockContext'
import { buildDashboardAgentContext } from '@/lib/dashboardAgentContext'
import { cn } from '@/lib/utils'
import { cnAlertError } from '@/lib/supabaseDataErrors'

function brl(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function followUpBadgeLabel(followUpAt: string | null, todayIso: string): { text: string; overdue: boolean } {
  if (!followUpAt) return { text: '—', overdue: false }
  if (followUpAt < todayIso) {
    const t0 = new Date(todayIso + 'T12:00:00').getTime()
    const t1 = new Date(followUpAt + 'T12:00:00').getTime()
    const days = Math.ceil((t0 - t1) / 86400000)
    return { text: `${days}d atraso`, overdue: true }
  }
  if (followUpAt === todayIso) return { text: 'Hoje', overdue: false }
  const tomorrow = addDaysIso(todayIso, 1)
  if (followUpAt === tomorrow) return { text: 'Amanhã', overdue: false }
  const t0 = new Date(todayIso + 'T12:00:00').getTime()
  const t1 = new Date(followUpAt + 'T12:00:00').getTime()
  const ahead = Math.round((t1 - t0) / 86400000)
  return { text: `Em ${ahead}d`, overdue: false }
}

function addDaysIso(iso: string, days: number): string {
  const [y, mo, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, mo - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

function DashboardSkeleton() {
  return (
    <div className="min-w-0 flex-1 space-y-6 px-4 py-4 sm:p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-muted/60" />
        ))}
      </div>
      <div className="h-10 animate-pulse rounded-lg bg-muted/50" />
      <div className="h-40 animate-pulse rounded-lg bg-muted/60" />
      <div className="h-40 animate-pulse rounded-lg bg-muted/60" />
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { activeOrganizationId } = useOrganization()
  const { data, isLoading, isError, error } = useDashboard(user, activeOrganizationId)
  const [modalId, setModalId] = useState<string | null>(null)

  const todayIso = new Date().toISOString().slice(0, 10)

  const contextJson = useMemo(
    () => (data ? buildDashboardAgentContext(data, todayIso) : '{}'),
    [data, todayIso]
  )
  useRegisterAssistantDock('dashboard', contextJson)

  if (isLoading) return <DashboardSkeleton />
  if (isError) {
    return (
      <div className="px-4 py-4 sm:p-6">
        <div className={cn('rounded-lg px-4 py-3 text-sm', cnAlertError)}>
          Erro ao carregar: {error instanceof Error ? error.message : String(error)}
        </div>
      </div>
    )
  }
  if (!data) return null

  const alertCount = data.alertasFollowUp.length

  return (
    <>
    <div className="min-w-0 flex-1 space-y-6 px-4 py-4 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="border-0 bg-muted/50 shadow-none">
            <CardContent className="p-4">
              <p className="mb-1 text-xs text-muted-foreground">Clientes</p>
              <p className="text-2xl font-semibold">{data.totalClientes}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {data.clientesNovosMes > 0
                  ? `+${data.clientesNovosMes} novo${data.clientesNovosMes !== 1 ? 's' : ''} este mês`
                  : 'Nenhum novo este mês'}
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-muted/50 shadow-none">
            <CardContent className="p-4">
              <p className="mb-1 text-xs text-muted-foreground">Orç. em aberto</p>
              <p className="text-2xl font-semibold">{data.orcamentosEmAberto}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {brl(data.valorPipelineAberto)} em jogo no funil
              </p>
            </CardContent>
          </Card>
          <Card className="border border-amber-100 bg-amber-50 shadow-none">
            <CardContent className="p-4">
              <p className="mb-1 text-xs text-amber-600">Dormindo</p>
              <p className="text-2xl font-semibold text-amber-700">{data.orcamentosDormindo}</p>
              <p className="mt-1 text-[11px] text-amber-600">Priorize a fila de follow-up ao lado</p>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground">
          {data.orcamentosGanhosMes > 0 ? (
            <>
              <span className="font-medium text-foreground">{data.orcamentosGanhosMes}</span>
              {` orçamento${data.orcamentosGanhosMes !== 1 ? 's' : ''} ganho${data.orcamentosGanhosMes !== 1 ? 's' : ''} este mês`}
            </>
          ) : (
            'Nenhum orçamento marcado como ganho neste mês'
          )}
        </p>

        <div className="flex flex-wrap gap-2 rounded-lg border border-dashed border-border bg-muted/20 p-3">
          <span className="w-full text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Atalhos
          </span>
          <Link
            to="/kanban"
            className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted/60"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Kanban
            <ChevronRight className="h-3 w-3 opacity-50" />
          </Link>
          <Link
            to="/orcamentos"
            className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted/60"
          >
            <Package className="h-3.5 w-3.5" />
            Orçamentos
            <ChevronRight className="h-3 w-3 opacity-50" />
          </Link>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <Bell className="h-4 w-4 text-brand-orange" />
            <h3 className="text-sm font-semibold">Follow-ups vencidos ou próximos</h3>
            <span className="ml-auto rounded-full bg-brand-orange px-2 py-0.5 text-xs font-medium text-white">
              {alertCount}
            </span>
          </div>
          <p className="mb-2 text-[11px] text-muted-foreground">
            Orçamentos enviados e dormindo com data até {FOLLOW_UP_ALERT_WINDOW_DAYS} dias à frente (e todos os
            atrasados).
          </p>
          <Card className="border shadow-none">
            <CardContent className="p-0">
              {data.alertasFollowUp.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nada pendente nesta janela.</p>
              ) : (
                data.alertasFollowUp.map((o, idx) => {
                  const { text, overdue } = followUpBadgeLabel(o.follow_up_at, todayIso)
                  const nome = o.clientes?.nome ?? 'Cliente'
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setModalId(o.id)}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40',
                        idx < data.alertasFollowUp.length - 1 && 'border-b'
                      )}
                    >
                      <AvatarCircle name={nome} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{nome}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {o.produto_descricao} · {o.valor ? brl(Number(o.valor)) : '—'}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'flex-shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                          overdue
                            ? 'border-[color-mix(in_srgb,var(--color-brand-danger)_40%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand-danger)_10%,var(--color-background))] text-[var(--color-brand-danger)]'
                            : 'border-[color-mix(in_srgb,var(--color-brand-primary)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand-primary)_8%,var(--color-background))] text-[var(--color-brand-primary)]'
                        )}
                      >
                        {text}
                      </span>
                    </button>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold">Últimas interações</h3>
          <Card className="border shadow-none">
            <CardContent className="p-0">
              {data.ultimas5.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Nenhuma interação registrada.
                </p>
              ) : (
                data.ultimas5.map((i, idx) => {
                  const nome = i.clientes?.nome ?? 'Cliente'
                  return (
                    <Link
                      key={i.id}
                      to={`/clientes/${i.cliente_id}`}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40',
                        idx < data.ultimas5.length - 1 && 'border-b'
                      )}
                    >
                      <AvatarCircle name={nome} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{nome}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {i.canal} · {i.anotacao || '—'}
                        </p>
                      </div>
                      <span className="flex-shrink-0 text-[11px] text-muted-foreground">
                        {new Date(i.data_contato).toLocaleDateString('pt-BR')}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
                    </Link>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
    </div>

    <OrcamentoDetailModal
      user={user}
      orcamentoId={modalId}
      open={modalId !== null}
      onOpenChange={(op) => !op && setModalId(null)}
    />
    </>
  )
}
