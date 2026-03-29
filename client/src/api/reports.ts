/**
 * Contrato `fetchReportsData` — relatórios por intervalo de datas (YYYY-MM-DD).
 *
 * Filtro principal de orçamentos: `data_orcamento` ∈ [start, end] (alinha ao “período do orçamento”).
 * “Em aberto” no resumo = mesmos status que o dashboard: novo_contato + orcamento_enviado
 * (apenas entre orçamentos já filtrados pelo intervalo).
 */
import type { PostgrestError } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { OrcamentoStatus } from '@/types/database'

/** Linha mínima devolvida pela query de relatórios (join cliente). */
export type ReportsOrcamentoRow = {
  id: string
  display_num: number
  cliente_id: string
  status: OrcamentoStatus
  valor: number
  data_orcamento: string
  clientes?: { nome: string } | null
}

export type ReportsDateRange = {
  /** Inclusive, YYYY-MM-DD */
  start: string
  /** Inclusive, YYYY-MM-DD */
  end: string
}

const ALL_STATUS: readonly OrcamentoStatus[] = [
  'novo_contato',
  'orcamento_enviado',
  'dormindo',
  'ganho',
  'perdido',
] as const

const ABERTO_STATUSES: readonly OrcamentoStatus[] = ['novo_contato', 'orcamento_enviado']

export type StatusResumo = {
  count: number
  valorSum: number
}

export type ReportsStatusBreakdown = Record<OrcamentoStatus, StatusResumo>

export type ReportsDailyBucket = {
  date: string
  count: number
}

export type ReportsTopCliente = {
  clienteId: string
  clienteNome: string
  orcamentosCount: number
  valorTotal: number
}

export type ReportsInteracaoCanal = {
  canal: string
  count: number
}

export type ReportsOrcamentoResumo = {
  id: string
  display_num: number
  clienteNome: string
  status: OrcamentoStatus
  valor: number
  data_orcamento: string
}

export type ReportsData = {
  range: ReportsDateRange
  /** Orçamentos com data_orcamento no intervalo */
  totalOrcamentosNoPeriodo: number
  /** Soma valor dos orçamentos “em aberto” (novo_contato + orcamento_enviado) no intervalo */
  valorEmAbertoNoPeriodo: number
  /** Soma valor ganhos (status ganho) no intervalo */
  valorGanhoNoPeriodo: number
  porStatus: ReportsStatusBreakdown
  seriePorDia: ReportsDailyBucket[]
  topClientes: ReportsTopCliente[]
  interacoesPorCanal: ReportsInteracaoCanal[]
  orcamentosResumo: ReportsOrcamentoResumo[]
  /** Definido quando a RPC limita `orcamentosResumo` a 1000 linhas */
  orcamentosResumoTruncated?: boolean
}

function emptyBreakdown(): ReportsStatusBreakdown {
  const o = {} as Record<OrcamentoStatus, StatusResumo>
  for (const s of ALL_STATUS) {
    o[s] = { count: 0, valorSum: 0 }
  }
  return o as ReportsStatusBreakdown
}

function mergePorStatusFromRpc(partial: Record<string, { count?: number; valorSum?: number }>): ReportsStatusBreakdown {
  const base = emptyBreakdown()
  for (const s of ALL_STATUS) {
    const p = partial[s]
    if (p && typeof p.count === 'number') {
      base[s] = { count: p.count, valorSum: Number(p.valorSum) || 0 }
    }
  }
  return base
}

function isMissingReportsRpcError(error: PostgrestError): boolean {
  const code = error.code ?? ''
  const msg = (error.message ?? '').toLowerCase()
  return (
    code === 'PGRST202' ||
    code === '42883' ||
    (msg.includes('function') && (msg.includes('does not exist') || msg.includes('not found'))) ||
    msg.includes('could not find the function')
  )
}

type ReportsRpcPayload = {
  totalOrcamentosNoPeriodo?: number
  valorEmAbertoNoPeriodo?: number
  valorGanhoNoPeriodo?: number
  porStatus?: Record<string, { count?: number; valorSum?: number }>
  seriePorDia?: ReportsDailyBucket[]
  topClientes?: ReportsTopCliente[]
  interacoesPorCanal?: ReportsInteracaoCanal[]
  orcamentosResumo?: ReportsOrcamentoResumo[]
  orcamentosResumoTruncated?: boolean
}

function parseReportsRpcData(range: ReportsDateRange, raw: unknown): ReportsData {
  const j = raw as ReportsRpcPayload
  return {
    range,
    totalOrcamentosNoPeriodo: Number(j.totalOrcamentosNoPeriodo) || 0,
    valorEmAbertoNoPeriodo: Number(j.valorEmAbertoNoPeriodo) || 0,
    valorGanhoNoPeriodo: Number(j.valorGanhoNoPeriodo) || 0,
    porStatus: mergePorStatusFromRpc(j.porStatus ?? {}),
    seriePorDia: Array.isArray(j.seriePorDia) ? j.seriePorDia : [],
    topClientes: Array.isArray(j.topClientes) ? j.topClientes : [],
    interacoesPorCanal: Array.isArray(j.interacoesPorCanal) ? j.interacoesPorCanal : [],
    orcamentosResumo: Array.isArray(j.orcamentosResumo) ? j.orcamentosResumo : [],
    orcamentosResumoTruncated: j.orcamentosResumoTruncated === true,
  }
}

function rangeToTimestampsIso(range: ReportsDateRange): { start: string; end: string } {
  return {
    start: `${range.start}T00:00:00.000Z`,
    end: `${range.end}T23:59:59.999Z`,
  }
}

function aggregateOrcamentos(rows: ReportsOrcamentoRow[]): Omit<ReportsData, 'range' | 'interacoesPorCanal'> {
  const porStatus = emptyBreakdown()
  const perDay = new Map<string, number>()
  const perCliente = new Map<string, { nome: string; count: number; valor: number }>()

  for (const r of rows) {
    const st = r.status
    const v = Number(r.valor) || 0
    porStatus[st].count += 1
    porStatus[st].valorSum += v

    const d = r.data_orcamento
    perDay.set(d, (perDay.get(d) ?? 0) + 1)

    const cid = r.cliente_id
    const nome = r.clientes?.nome ?? '—'
    const cur = perCliente.get(cid) ?? { nome, count: 0, valor: 0 }
    cur.count += 1
    cur.valor += v
    perCliente.set(cid, cur)
  }

  const sortedDays = [...perDay.entries()].sort(([a], [b]) => a.localeCompare(b))
  const seriePorDia: ReportsDailyBucket[] = sortedDays.map(([date, count]) => ({ date, count }))

  const topClientes: ReportsTopCliente[] = [...perCliente.entries()]
    .map(([clienteId, x]) => ({
      clienteId,
      clienteNome: x.nome,
      orcamentosCount: x.count,
      valorTotal: x.valor,
    }))
    .sort((a, b) => b.valorTotal - a.valorTotal)
    .slice(0, 10)

  let valorEmAbertoNoPeriodo = 0
  let valorGanhoNoPeriodo = 0
  for (const r of rows) {
    const v = Number(r.valor) || 0
    if (ABERTO_STATUSES.includes(r.status)) valorEmAbertoNoPeriodo += v
    if (r.status === 'ganho') valorGanhoNoPeriodo += v
  }

  const orcamentosResumo: ReportsOrcamentoResumo[] = rows.map((r) => ({
    id: r.id,
    display_num: r.display_num,
    clienteNome: r.clientes?.nome ?? '—',
    status: r.status,
    valor: Number(r.valor) || 0,
    data_orcamento: r.data_orcamento,
  }))

  return {
    totalOrcamentosNoPeriodo: rows.length,
    valorEmAbertoNoPeriodo,
    valorGanhoNoPeriodo,
    porStatus,
    seriePorDia,
    topClientes,
    orcamentosResumo,
  }
}

async function fetchReportsDataLegacy(
  sb: SupabaseClient,
  organizationId: string,
  range: ReportsDateRange
): Promise<ReportsData> {
  const { start: tsStart, end: tsEnd } = rangeToTimestampsIso(range)

  const [{ data: orcRows, error: oe }, { data: intRows, error: ie }] = await Promise.all([
    sb
      .from('orcamentos')
      .select('id, display_num, cliente_id, status, valor, data_orcamento, clientes(nome)')
      .eq('organization_id', organizationId)
      .gte('data_orcamento', range.start)
      .lte('data_orcamento', range.end)
      .order('data_orcamento', { ascending: true }),
    sb
      .from('interacoes')
      .select('canal')
      .eq('organization_id', organizationId)
      .gte('data_contato', tsStart)
      .lte('data_contato', tsEnd),
  ])

  if (oe) throw oe
  if (ie) throw ie

  const rows = (orcRows ?? []) as unknown as ReportsOrcamentoRow[]
  const agg = aggregateOrcamentos(rows)

  const canalCounts = new Map<string, number>()
  for (const row of intRows ?? []) {
    const c = String((row as { canal: string }).canal ?? '—')
    canalCounts.set(c, (canalCounts.get(c) ?? 0) + 1)
  }
  const interacoesPorCanal: ReportsInteracaoCanal[] = [...canalCounts.entries()]
    .map(([canal, count]) => ({ canal, count }))
    .sort((a, b) => b.count - a.count)

  return {
    range,
    interacoesPorCanal,
    ...agg,
  }
}

export async function fetchReportsData(
  sb: SupabaseClient,
  _userId: string,
  organizationId: string,
  range: ReportsDateRange
): Promise<ReportsData> {
  if (range.start > range.end) {
    throw new Error('Data inicial não pode ser posterior à data final.')
  }

  const { data: rpcRaw, error: rpcErr } = await sb.rpc('reports_data_for_organization_range', {
    p_organization_id: organizationId,
    p_start: range.start,
    p_end: range.end,
  })

  if (!rpcErr && rpcRaw != null && typeof rpcRaw === 'object') {
    return parseReportsRpcData(range, rpcRaw)
  }

  if (rpcErr) {
    if (isMissingReportsRpcError(rpcErr)) {
      return fetchReportsDataLegacy(sb, organizationId, range)
    }
    throw rpcErr
  }

  return fetchReportsDataLegacy(sb, organizationId, range)
}
