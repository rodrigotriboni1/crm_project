/**
 * Contrato `fetchDashboard` (KPIs do cockpit — alterações aqui são breaking para produto/analytics).
 *
 * Queries em `Promise.all` (ordem fixa, usada nos testes de contrato):
 *  0. totalClientes — count `clientes` do user com `ativo = true` (head).
 *  1. orcamentosEmAberto — count `orcamentos` status ∈ {novo_contato, orcamento_enviado}.
 *  2. orcamentosDormindo — count `orcamentos` status = dormindo.
 *  3. clientesNovosMes — count `clientes` ativos com created_at no mês civil local (início→fim do mês, ISO).
 *  4. orcamentosGanhosMes — count `orcamentos` status = ganho e updated_at no mesmo intervalo mensal local.
 *  5. valorPipelineAberto — select `valor` onde status ∈ {novo_contato, orcamento_enviado}; soma numérica.
 *  6. alertasFollowUp — orçamentos com follow_up_at não nulo, ≤ hoje+N dias (`FOLLOW_UP_ALERT_WINDOW_DAYS`),
 *     status ∈ {orcamento_enviado, dormindo}; ordenação: atrasados (data < hoje) primeiro, depois por data ASC.
 *
 * Pós Promise.all: `ultimas5` via `listRecentInteracoes(sb, userId, organizationId, 5)` (não entra no array paralelo).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { OrcamentoStatus } from '@/types/database'
import { FOLLOW_UP_ALERT_WINDOW_DAYS } from './constants'
import type { OrcamentoRow } from './orcamentos'
import { listRecentInteracoes, type InteracaoRow } from './interacoes'

/** Incluídos na query de `alertasFollowUp` (documentar alterações no bloco de contrato acima). */
export const DASHBOARD_FOLLOW_UP_ALERT_STATUSES: readonly OrcamentoStatus[] = [
  'orcamento_enviado',
  'dormindo',
]

function addDaysToIsoDate(isoDate: string, days: number): string {
  const [y, mo, d] = isoDate.split('-').map(Number)
  const dt = new Date(Date.UTC(y, mo - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

function localMonthBoundsIso(): { start: string; end: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const start = new Date(y, m, 1, 0, 0, 0, 0)
  const end = new Date(y, m + 1, 0, 23, 59, 59, 999)
  return { start: start.toISOString(), end: end.toISOString() }
}

export type DashboardData = {
  totalClientes: number
  orcamentosEmAberto: number
  orcamentosDormindo: number
  /** Soma dos valores em novo_contato + orcamento_enviado (mesmo critério do card “em aberto”). */
  valorPipelineAberto: number
  /** Clientes com created_at no mês corrente (fuso local do navegador). */
  clientesNovosMes: number
  /** Orçamentos ganhos no mês (status ganho, updated_at no mês corrente, fuso local). */
  orcamentosGanhosMes: number
  alertasFollowUp: OrcamentoRow[]
  ultimas5: InteracaoRow[]
}

export async function fetchDashboard(
  sb: SupabaseClient,
  userId: string,
  organizationId: string
): Promise<DashboardData> {
  const today = new Date().toISOString().slice(0, 10)
  const followUpWindowEnd = addDaysToIsoDate(today, FOLLOW_UP_ALERT_WINDOW_DAYS)
  const { start: monthStart, end: monthEnd } = localMonthBoundsIso()

  const [
    { count: totalClientes },
    { count: orcamentosEmAberto },
    { count: orcamentosDormindo },
    { count: clientesNovosMes },
    { count: orcamentosGanhosMes },
    { data: pipelineRows, error: pe },
    { data: alertRows, error: ae },
  ] = await Promise.all([
    sb
      .from('clientes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('ativo', true),
    sb
      .from('orcamentos')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .in('status', ['novo_contato', 'orcamento_enviado']),
    sb
      .from('orcamentos')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('status', 'dormindo'),
    sb
      .from('clientes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('ativo', true)
      .gte('created_at', monthStart)
      .lte('created_at', monthEnd),
    sb
      .from('orcamentos')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('status', 'ganho')
      .gte('updated_at', monthStart)
      .lte('updated_at', monthEnd),
    sb
      .from('orcamentos')
      .select('valor')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .in('status', ['novo_contato', 'orcamento_enviado']),
    sb
      .from('orcamentos')
      .select('*, clientes(nome), produtos(nome, codigo, categoria)')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .not('follow_up_at', 'is', null)
      .lte('follow_up_at', followUpWindowEnd)
      .in('status', [...DASHBOARD_FOLLOW_UP_ALERT_STATUSES]),
  ])

  if (pe) throw pe
  if (ae) throw ae

  const valorPipelineAberto = (pipelineRows ?? []).reduce((acc, row) => acc + Number((row as { valor: number }).valor), 0)

  const sortedAlerts = ((alertRows ?? []) as OrcamentoRow[]).sort((a, b) => {
    const fa = a.follow_up_at!
    const fb = b.follow_up_at!
    const aOver = fa < today
    const bOver = fb < today
    if (aOver !== bOver) return aOver ? -1 : 1
    return fa.localeCompare(fb)
  })

  const ultimas5 = await listRecentInteracoes(sb, userId, organizationId, 5)

  return {
    totalClientes: totalClientes ?? 0,
    orcamentosEmAberto: orcamentosEmAberto ?? 0,
    orcamentosDormindo: orcamentosDormindo ?? 0,
    valorPipelineAberto,
    clientesNovosMes: clientesNovosMes ?? 0,
    orcamentosGanhosMes: orcamentosGanhosMes ?? 0,
    alertasFollowUp: sortedAlerts,
    ultimas5,
  }
}
