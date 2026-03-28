import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Cliente,
  ClienteListItem,
  ClienteTipo,
  ClienteUpdate,
  Interacao,
  Orcamento,
  OrcamentoStatus,
  Produto,
  ProdutoUpdate,
} from '@/types/database'

export type OrcamentoProdutoJoin = {
  nome: string
  codigo: string | null
  categoria: string | null
}

const FUNIL: OrcamentoStatus[] = ['novo_contato', 'orcamento_enviado', 'dormindo']

/** Orçamentos com follow-up agendado aparecem na fila do dashboard se a data for até N dias à frente (e todos os atrasados). */
export const FOLLOW_UP_ALERT_WINDOW_DAYS = 7

const ALERT_STATUSES: OrcamentoStatus[] = ['orcamento_enviado', 'dormindo']

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

export async function listClientes(sb: SupabaseClient, userId: string): Promise<Cliente[]> {
  const { data, error } = await sb
    .from('clientes')
    .select('*')
    .eq('user_id', userId)
    .order('nome')
  if (error) throw error
  return (data ?? []) as Cliente[]
}

export async function listClientesComUltimoContato(
  sb: SupabaseClient,
  userId: string
): Promise<ClienteListItem[]> {
  const clientes = await listClientes(sb, userId)
  const { data: ints, error } = await sb
    .from('interacoes')
    .select('cliente_id, data_contato')
    .eq('user_id', userId)
    .order('data_contato', { ascending: false })
  if (error) throw error
  const first = new Map<string, string>()
  for (const row of ints ?? []) {
    const cid = (row as { cliente_id: string }).cliente_id
    if (!first.has(cid)) first.set(cid, (row as { data_contato: string }).data_contato)
  }
  return clientes.map((c) => ({ ...c, ultimo_contato: first.get(c.id) ?? null }))
}

export async function getCliente(sb: SupabaseClient, userId: string, id: string): Promise<Cliente | null> {
  const { data, error } = await sb
    .from('clientes')
    .select('*')
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return (data as Cliente) ?? null
}

export async function createCliente(
  sb: SupabaseClient,
  userId: string,
  row: {
    nome: string
    tipo?: ClienteTipo
    whatsapp?: string
    telefone?: string
    produtos_habituais?: string
    observacoes?: string
    cor?: string
    iniciais?: string
  }
): Promise<Cliente> {
  const { data, error } = await sb
    .from('clientes')
    .insert({
      user_id: userId,
      nome: row.nome,
      tipo: row.tipo ?? 'novo',
      whatsapp: row.whatsapp ?? null,
      telefone: row.telefone ?? null,
      produtos_habituais: row.produtos_habituais ?? null,
      observacoes: row.observacoes ?? null,
      cor: row.cor ?? null,
      iniciais: row.iniciais ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data as Cliente
}

export async function updateCliente(
  sb: SupabaseClient,
  userId: string,
  id: string,
  patch: ClienteUpdate
): Promise<Cliente> {
  const { data, error } = await sb
    .from('clientes')
    .update(patch)
    .eq('user_id', userId)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Cliente
}

export type OrcamentoRow = Orcamento & {
  clientes?: { nome: string } | null
  produtos?: OrcamentoProdutoJoin | null
}

export async function listProdutos(
  sb: SupabaseClient,
  userId: string,
  opts?: { ativosApenas?: boolean }
): Promise<Produto[]> {
  let q = sb.from('produtos').select('*').eq('user_id', userId).order('nome')
  if (opts?.ativosApenas) {
    q = q.eq('ativo', true)
  }
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as Produto[]
}

export async function createProduto(
  sb: SupabaseClient,
  userId: string,
  row: {
    nome: string
    codigo?: string | null
    categoria?: string | null
    descricao?: string | null
    unidade?: string
    especificacoes?: Record<string, unknown>
    ativo?: boolean
  }
): Promise<Produto> {
  const { data, error } = await sb
    .from('produtos')
    .insert({
      user_id: userId,
      nome: row.nome,
      codigo: row.codigo ?? null,
      categoria: row.categoria ?? null,
      descricao: row.descricao ?? null,
      unidade: row.unidade ?? 'un',
      especificacoes: row.especificacoes ?? {},
      ativo: row.ativo ?? true,
    })
    .select()
    .single()
  if (error) throw error
  return data as Produto
}

export async function updateProduto(
  sb: SupabaseClient,
  userId: string,
  id: string,
  patch: ProdutoUpdate
): Promise<void> {
  const { error } = await sb
    .from('produtos')
    .update(patch)
    .eq('user_id', userId)
    .eq('id', id)
  if (error) throw error
}

export async function listOrcamentos(sb: SupabaseClient, userId: string): Promise<OrcamentoRow[]> {
  const { data, error } = await sb
    .from('orcamentos')
    .select('*, clientes(nome), produtos(nome, codigo, categoria)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as OrcamentoRow[]
}

export async function listOrcamentosByCliente(
  sb: SupabaseClient,
  userId: string,
  clienteId: string
): Promise<OrcamentoRow[]> {
  const { data, error } = await sb
    .from('orcamentos')
    .select('*, produtos(nome, codigo, categoria)')
    .eq('user_id', userId)
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as OrcamentoRow[]
}

export async function getOrcamento(
  sb: SupabaseClient,
  userId: string,
  id: string
): Promise<OrcamentoRow | null> {
  const { data, error } = await sb
    .from('orcamentos')
    .select('*, clientes(nome), produtos(nome, codigo, categoria)')
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return (data as OrcamentoRow) ?? null
}

export async function createOrcamento(
  sb: SupabaseClient,
  userId: string,
  row: {
    cliente_id: string
    produto_descricao: string
    produto_id?: string | null
    valor: number
    status?: OrcamentoStatus
    data_orcamento: string
    follow_up_at: string | null
    tax_id?: string | null
  }
): Promise<Orcamento> {
  const { data, error } = await sb
    .from('orcamentos')
    .insert({
      user_id: userId,
      cliente_id: row.cliente_id,
      produto_id: row.produto_id ?? null,
      produto_descricao: row.produto_descricao,
      valor: row.valor,
      status: row.status ?? 'novo_contato',
      data_orcamento: row.data_orcamento,
      follow_up_at: row.follow_up_at,
      tax_id: row.tax_id ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data as Orcamento
}

export async function patchOrcamento(
  sb: SupabaseClient,
  userId: string,
  id: string,
  patch: {
    tax_id?: string | null
    produto_id?: string | null
    produto_descricao?: string
  }
): Promise<void> {
  const { error } = await sb
    .from('orcamentos')
    .update(patch)
    .eq('user_id', userId)
    .eq('id', id)
  if (error) throw error
}

export async function applyOrcamentoUpdate(
  sb: SupabaseClient,
  args: {
    orcamentoId: string
    status: OrcamentoStatus
    followUpAt: string | null
    note?: string | null
  }
): Promise<void> {
  const { error } = await sb.rpc('apply_orcamento_update', {
    p_orcamento_id: args.orcamentoId,
    p_status: args.status,
    p_follow_up: args.followUpAt,
    p_note: args.note ?? null,
  })
  if (error) throw error
}

export type InteracaoRow = Interacao & { clientes: { nome: string } | null }

export async function listInteracoes(
  sb: SupabaseClient,
  userId: string,
  clienteId: string
): Promise<Interacao[]> {
  const { data, error } = await sb
    .from('interacoes')
    .select('*')
    .eq('user_id', userId)
    .eq('cliente_id', clienteId)
    .order('data_contato', { ascending: false })
  if (error) throw error
  return (data ?? []) as Interacao[]
}

export async function listRecentInteracoes(
  sb: SupabaseClient,
  userId: string,
  limit = 10
): Promise<InteracaoRow[]> {
  const { data, error } = await sb
    .from('interacoes')
    .select('*, clientes(nome)')
    .eq('user_id', userId)
    .order('data_contato', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as InteracaoRow[]
}

export async function createInteracao(
  sb: SupabaseClient,
  userId: string,
  row: {
    cliente_id: string
    canal: string
    anotacao: string
    data_contato?: string
    orcamento_id?: string | null
  }
): Promise<Interacao> {
  const { data, error } = await sb
    .from('interacoes')
    .insert({
      user_id: userId,
      cliente_id: row.cliente_id,
      canal: row.canal,
      anotacao: row.anotacao,
      data_contato: row.data_contato ?? new Date().toISOString(),
      orcamento_id: row.orcamento_id ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data as Interacao
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

export async function fetchDashboard(sb: SupabaseClient, userId: string): Promise<DashboardData> {
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
    sb.from('clientes').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    sb
      .from('orcamentos')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['novo_contato', 'orcamento_enviado']),
    sb.from('orcamentos').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'dormindo'),
    sb
      .from('clientes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', monthStart)
      .lte('created_at', monthEnd),
    sb
      .from('orcamentos')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'ganho')
      .gte('updated_at', monthStart)
      .lte('updated_at', monthEnd),
    sb
      .from('orcamentos')
      .select('valor')
      .eq('user_id', userId)
      .in('status', ['novo_contato', 'orcamento_enviado']),
    sb
      .from('orcamentos')
      .select('*, clientes(nome), produtos(nome, codigo, categoria)')
      .eq('user_id', userId)
      .not('follow_up_at', 'is', null)
      .lte('follow_up_at', followUpWindowEnd)
      .in('status', ALERT_STATUSES),
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

  const ultimas5 = await listRecentInteracoes(sb, userId, 5)

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

export { FUNIL }
