import type { PostgrestError } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeClienteTaxId } from '@/lib/taxId'
import type { Cliente, ClienteListItem, ClienteTipo, ClienteUpdate } from '@/types/database'

/** PostgREST quando a função RPC ainda não existe (migração não aplicada). */
function isMissingListClientesRpcError(error: PostgrestError): boolean {
  const code = error.code ?? ''
  const msg = (error.message ?? '').toLowerCase()
  return (
    code === 'PGRST202' ||
    code === '42883' ||
    (msg.includes('function') && (msg.includes('does not exist') || msg.includes('not found'))) ||
    msg.includes('could not find the function')
  )
}

/** Caminho legado: 2 queries + merge no browser (use se RPC `list_clientes_com_ultimo_contato` não existir). */
async function listClientesComUltimoContatoLegacy(
  sb: SupabaseClient,
  userId: string,
  opts?: { ativosApenas?: boolean }
): Promise<ClienteListItem[]> {
  const clientes = await listClientes(sb, userId, opts)
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

function mapRpcRowsToClienteListItem(rows: Record<string, unknown>[]): ClienteListItem[] {
  return rows.map((r) => {
    const ultimo = r.ultimo_contato
    return {
      id: r.id as string,
      user_id: r.user_id as string,
      nome: r.nome as string,
      tipo: r.tipo as Cliente['tipo'],
      tax_id: (r.tax_id as string | null) ?? null,
      document_enrichment: (r.document_enrichment as Cliente['document_enrichment']) ?? null,
      ativo: r.ativo as boolean,
      whatsapp: (r.whatsapp as string | null) ?? null,
      telefone: (r.telefone as string | null) ?? null,
      produtos_habituais: (r.produtos_habituais as string | null) ?? null,
      observacoes: (r.observacoes as string | null) ?? null,
      cor: (r.cor as string | null) ?? null,
      iniciais: (r.iniciais as string | null) ?? null,
      created_at: r.created_at as string,
      updated_at: r.updated_at as string,
      ultimo_contato: ultimo == null ? null : String(ultimo),
    }
  })
}

export async function listClientes(
  sb: SupabaseClient,
  userId: string,
  opts?: { ativosApenas?: boolean }
): Promise<Cliente[]> {
  let q = sb.from('clientes').select('*').eq('user_id', userId).order('nome')
  if (opts?.ativosApenas) {
    q = q.eq('ativo', true)
  }
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as Cliente[]
}

export async function listClientesComUltimoContato(
  sb: SupabaseClient,
  userId: string,
  opts?: { ativosApenas?: boolean }
): Promise<ClienteListItem[]> {
  const { data, error } = await sb.rpc('list_clientes_com_ultimo_contato', {
    p_ativos_apenas: opts?.ativosApenas === true,
  })
  if (error) {
    if (isMissingListClientesRpcError(error)) {
      return listClientesComUltimoContatoLegacy(sb, userId, opts)
    }
    throw error
  }
  const rows = (data ?? []) as Record<string, unknown>[]
  return mapRpcRowsToClienteListItem(rows)
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
    tax_id?: string | null
    document_enrichment?: Cliente['document_enrichment']
    whatsapp?: string
    telefone?: string
    produtos_habituais?: string
    observacoes?: string
    cor?: string
    iniciais?: string
    ativo?: boolean
  }
): Promise<Cliente> {
  const { data, error } = await sb
    .from('clientes')
    .insert({
      user_id: userId,
      nome: row.nome,
      tipo: row.tipo ?? 'novo',
      ativo: row.ativo ?? true,
      tax_id: normalizeClienteTaxId(row.tax_id),
      document_enrichment: row.document_enrichment ?? null,
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
  const patchNorm: ClienteUpdate = { ...patch }
  if (Object.prototype.hasOwnProperty.call(patch, 'tax_id')) {
    patchNorm.tax_id = normalizeClienteTaxId(patch.tax_id ?? null)
  }
  const { data, error } = await sb
    .from('clientes')
    .update(patchNorm)
    .eq('user_id', userId)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Cliente
}
