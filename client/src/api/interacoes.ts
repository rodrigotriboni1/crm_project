import type { SupabaseClient } from '@supabase/supabase-js'
import type { Interacao } from '@/types/database'
import type { InteracaoCanalUsuario } from '@/lib/interacaoCanal'

export type InteracaoRow = Interacao & { clientes: { nome: string } | null }

export const INTERACOES_PAGE_SIZE = 40

export async function listInteracoes(
  sb: SupabaseClient,
  _userId: string,
  organizationId: string,
  clienteId: string
): Promise<Interacao[]> {
  const { data, error } = await sb
    .from('interacoes')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('cliente_id', clienteId)
    .order('data_contato', { ascending: false })
  if (error) throw error
  return (data ?? []) as Interacao[]
}

/** Página de interacções (mais recentes primeiro). */
export async function listInteracoesPage(
  sb: SupabaseClient,
  _userId: string,
  organizationId: string,
  clienteId: string,
  opts: { limit?: number; offset?: number }
): Promise<Interacao[]> {
  const limit = Math.min(Math.max(opts.limit ?? INTERACOES_PAGE_SIZE, 1), 200)
  const offset = Math.max(opts.offset ?? 0, 0)
  const { data, error } = await sb
    .from('interacoes')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('cliente_id', clienteId)
    .order('data_contato', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) throw error
  return (data ?? []) as Interacao[]
}

export async function listRecentInteracoes(
  sb: SupabaseClient,
  _userId: string,
  organizationId: string,
  limit = 10
): Promise<InteracaoRow[]> {
  const { data, error } = await sb
    .from('interacoes')
    .select('*, clientes(nome)')
    .eq('organization_id', organizationId)
    .order('data_contato', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as InteracaoRow[]
}

export async function createInteracao(
  sb: SupabaseClient,
  userId: string,
  organizationId: string,
  row: {
    cliente_id: string
    canal: InteracaoCanalUsuario
    anotacao: string
    data_contato?: string
    orcamento_id?: string | null
  }
): Promise<Interacao> {
  const { data, error } = await sb
    .from('interacoes')
    .insert({
      user_id: userId,
      organization_id: organizationId,
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
