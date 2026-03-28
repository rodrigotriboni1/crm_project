import type { SupabaseClient } from '@supabase/supabase-js'
import type { Produto, ProdutoUpdate } from '@/types/database'

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
