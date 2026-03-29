import type { SupabaseClient } from '@supabase/supabase-js'
import type { Orcamento, OrcamentoStatus } from '@/types/database'

export type OrcamentoProdutoJoin = {
  nome: string
  codigo: string | null
  categoria: string | null
}

export type OrcamentoRow = Orcamento & {
  clientes?: { nome: string } | null
  produtos?: OrcamentoProdutoJoin | null
}

/** Tamanho de página ao carregar orçamentos (evita uma única resposta gigante). */
export const ORCAMENTOS_PAGE_SIZE = 300

const ORCAMENTOS_LIST_SELECT = '*, clientes(nome), produtos(nome, codigo, categoria)'

/**
 * Uma página de orçamentos ordenados por `created_at desc`, `id desc`.
 * Com índice `orcamentos_user_created_id_idx` cada página evita full scan.
 */
export async function listOrcamentosPage(
  sb: SupabaseClient,
  userId: string,
  organizationId: string,
  opts: { limit?: number; offset?: number }
): Promise<OrcamentoRow[]> {
  const limit = Math.min(Math.max(opts.limit ?? ORCAMENTOS_PAGE_SIZE, 1), 500)
  const offset = Math.max(opts.offset ?? 0, 0)
  const { data, error } = await sb
    .from('orcamentos')
    .select(ORCAMENTOS_LIST_SELECT)
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) throw error
  return (data ?? []) as OrcamentoRow[]
}

/**
 * Lista completa do utilizador, obtida em páginas (menos pressão de memória/rede que um único select).
 */
export async function listOrcamentos(
  sb: SupabaseClient,
  userId: string,
  organizationId: string
): Promise<OrcamentoRow[]> {
  const all: OrcamentoRow[] = []
  let offset = 0
  while (true) {
    const chunk = await listOrcamentosPage(sb, userId, organizationId, {
      offset,
      limit: ORCAMENTOS_PAGE_SIZE,
    })
    all.push(...chunk)
    if (chunk.length < ORCAMENTOS_PAGE_SIZE) break
    offset += ORCAMENTOS_PAGE_SIZE
  }
  return all
}

export async function listOrcamentosByCliente(
  sb: SupabaseClient,
  userId: string,
  organizationId: string,
  clienteId: string
): Promise<OrcamentoRow[]> {
  const { data, error } = await sb
    .from('orcamentos')
    .select('*, produtos(nome, codigo, categoria)')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as OrcamentoRow[]
}

export async function getOrcamento(
  sb: SupabaseClient,
  userId: string,
  organizationId: string,
  id: string
): Promise<OrcamentoRow | null> {
  const { data, error } = await sb
    .from('orcamentos')
    .select('*, clientes(nome), produtos(nome, codigo, categoria)')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return (data as OrcamentoRow) ?? null
}

export async function createOrcamento(
  sb: SupabaseClient,
  userId: string,
  organizationId: string,
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
      organization_id: organizationId,
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
  organizationId: string,
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
    .eq('organization_id', organizationId)
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
    lostReason?: string | null
  }
): Promise<void> {
  const { error } = await sb.rpc('apply_orcamento_update', {
    p_orcamento_id: args.orcamentoId,
    p_status: args.status,
    p_follow_up: args.followUpAt,
    p_note: args.note ?? null,
    p_lost_reason: args.lostReason ?? null,
  })
  if (error) throw error
}
