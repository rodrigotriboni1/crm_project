import type { PostgrestError } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { clientesKpisFromRpcSummary, clientesListKpis } from '@/lib/clienteListHelpers'
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
  organizationId: string,
  opts?: { ativosApenas?: boolean }
): Promise<ClienteListItem[]> {
  const clientes = await listClientes(sb, userId, organizationId, opts)
  const { data: ints, error } = await sb
    .from('interacoes')
    .select('cliente_id, data_contato')
    .eq('organization_id', organizationId)
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
      organization_id: (r.organization_id as string) ?? '',
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
  organizationId: string,
  opts?: { ativosApenas?: boolean }
): Promise<Cliente[]> {
  let q = sb
    .from('clientes')
    .select('*')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .order('nome')
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
  organizationId: string,
  opts?: { ativosApenas?: boolean }
): Promise<ClienteListItem[]> {
  const { data, error } = await sb.rpc('list_clientes_com_ultimo_contato', {
    p_organization_id: organizationId,
    p_ativos_apenas: opts?.ativosApenas === true,
  })
  if (error) {
    if (isMissingListClientesRpcError(error)) {
      return listClientesComUltimoContatoLegacy(sb, userId, organizationId, opts)
    }
    throw error
  }
  const rows = (data ?? []) as Record<string, unknown>[]
  return mapRpcRowsToClienteListItem(rows)
}

export const CLIENTES_PAGE_SIZE = 150

export type ClientesPageCursor = { nome: string; id: string }

export type FetchClientesPageResult = {
  rows: ClienteListItem[]
  nextCursor: ClientesPageCursor | null
}

function rowAfterCursor(c: ClienteListItem, cursor: ClientesPageCursor): boolean {
  if (c.nome > cursor.nome) return true
  if (c.nome < cursor.nome) return false
  return c.id > cursor.id
}

async function fetchClientesComUltimoContatoPageLegacy(
  sb: SupabaseClient,
  userId: string,
  organizationId: string,
  opts: {
    ativosApenas?: boolean
    limit: number
    cursor: ClientesPageCursor | null
  }
): Promise<FetchClientesPageResult> {
  const all = await listClientesComUltimoContato(sb, userId, organizationId, {
    ativosApenas: opts.ativosApenas,
  })
  const filtered = opts.cursor ? all.filter((c) => rowAfterCursor(c, opts.cursor!)) : all
  const rows = filtered.slice(0, opts.limit)
  const last = rows[rows.length - 1]
  const nextCursor =
    rows.length === opts.limit && last ? { nome: last.nome, id: last.id } : null
  return { rows, nextCursor }
}

/** Uma página de clientes (cursor em nome, id); substitui carregar toda a lista na UI principal. */
export async function fetchClientesComUltimoContatoPage(
  sb: SupabaseClient,
  userId: string,
  organizationId: string,
  opts: {
    ativosApenas?: boolean
    limit?: number
    cursor?: ClientesPageCursor | null
  }
): Promise<FetchClientesPageResult> {
  const limit = Math.min(Math.max(opts.limit ?? CLIENTES_PAGE_SIZE, 1), 500)
  const cursor = opts.cursor ?? null
  const { data, error } = await sb.rpc('list_clientes_com_ultimo_contato_page', {
    p_organization_id: organizationId,
    p_ativos_apenas: opts.ativosApenas === true,
    p_limit: limit,
    p_cursor_nome: cursor?.nome ?? null,
    p_cursor_id: cursor?.id ?? null,
  })
  if (error) {
    if (isMissingListClientesRpcError(error)) {
      return fetchClientesComUltimoContatoPageLegacy(sb, userId, organizationId, {
        ativosApenas: opts.ativosApenas,
        limit,
        cursor,
      })
    }
    throw error
  }
  const rows = mapRpcRowsToClienteListItem((data ?? []) as Record<string, unknown>[])
  const last = rows[rows.length - 1]
  const nextCursor = rows.length === limit && last ? { nome: last.nome, id: last.id } : null
  return { rows, nextCursor }
}

export type ClientesKpisDisplay = ReturnType<typeof clientesListKpis>

/** KPIs agregados no servidor (fallback: lista completa legada). */
export async function fetchClientesKpisSummary(
  sb: SupabaseClient,
  userId: string,
  organizationId: string
): Promise<ClientesKpisDisplay> {
  const { data, error } = await sb.rpc('clientes_kpis_summary', {
    p_organization_id: organizationId,
  })
  if (error) {
    if (isMissingListClientesRpcError(error)) {
      const all = await listClientesComUltimoContato(sb, userId, organizationId, {})
      return clientesListKpis(all)
    }
    throw error
  }
  const j = (data ?? {}) as Record<string, unknown>
  return clientesKpisFromRpcSummary({
    ativos: Number(j.ativos ?? 0),
    arquivados: Number(j.arquivados ?? 0),
    recompras: Number(j.recompras ?? 0),
    com_telefone: Number(j.com_telefone ?? 0),
    sem_contato_30: Number(j.sem_contato_30 ?? 0),
  })
}

export type ImportClientesBatchError = { index: number; msg: string }

/** Insere várias fichas num único RPC (`import_clientes_batch`). */
export async function importClientesBatch(
  sb: SupabaseClient,
  organizationId: string,
  items: Record<string, unknown>[]
): Promise<{ inserted: number; errors: ImportClientesBatchError[] }> {
  const { data, error } = await sb.rpc('import_clientes_batch', {
    p_organization_id: organizationId,
    p_rows: items,
  })
  if (error) {
    if (isMissingListClientesRpcError(error)) {
      throw new Error(
        'Função import_clientes_batch não encontrada. Aplique as migrações Supabase mais recentes (ver docs/supabase-migration-verify.md).'
      )
    }
    throw error
  }
  const out = (data ?? {}) as { inserted?: number; errors?: unknown }
  const rawErrs = Array.isArray(out.errors) ? out.errors : []
  const errors: ImportClientesBatchError[] = rawErrs.map((e) => {
    const o = e as Record<string, unknown>
    return { index: Number(o.index ?? 0), msg: String(o.msg ?? 'Erro desconhecido') }
  })
  return { inserted: Number(out.inserted ?? 0), errors }
}

export async function getCliente(
  sb: SupabaseClient,
  userId: string,
  organizationId: string,
  id: string
): Promise<Cliente | null> {
  const { data, error } = await sb
    .from('clientes')
    .select('*')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return (data as Cliente) ?? null
}

export async function createCliente(
  sb: SupabaseClient,
  userId: string,
  organizationId: string,
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
      organization_id: organizationId,
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
  organizationId: string,
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
    .eq('organization_id', organizationId)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Cliente
}
