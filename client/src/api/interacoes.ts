import type { SupabaseClient } from '@supabase/supabase-js'
import type { Interacao } from '@/types/database'

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
