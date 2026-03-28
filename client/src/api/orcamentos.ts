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
