import type { SupabaseClient } from '@supabase/supabase-js'

function normalizeRpcJsonArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    const vals = Object.values(data as Record<string, unknown>)
    if (vals.length && vals.every((v) => v && typeof v === 'object')) return vals
  }
  if (typeof data === 'string') {
    try {
      const p = JSON.parse(data) as unknown
      return Array.isArray(p) ? p : []
    } catch {
      return []
    }
  }
  return []
}

export type OrganizationMemberRow = {
  user_id: string
  email: string | null
  full_name: string | null
  role: 'owner' | 'member'
  data_scope: 'organization' | 'own'
}

export async function listOrganizationMembers(
  sb: SupabaseClient,
  organizationId: string
): Promise<OrganizationMemberRow[]> {
  const { data, error } = await sb.rpc('list_organization_members', {
    p_organization_id: organizationId,
  })
  if (error) throw error
  const raw = normalizeRpcJsonArray(data)
  return raw.map((row) => {
    const r = row as Record<string, unknown>
    return {
      user_id: String(r.user_id ?? ''),
      email: r.email != null ? String(r.email) : null,
      full_name: r.full_name != null ? String(r.full_name) : null,
      role: r.role === 'owner' ? 'owner' : 'member',
      data_scope: r.data_scope === 'own' ? 'own' : 'organization',
    }
  })
}

export type AddMemberErrorCode =
  | 'not_authenticated'
  | 'invalid_email'
  | 'not_owner'
  | 'user_not_found'
  | 'already_member'
  | 'unknown'

export type AddMemberResult =
  | { ok: true; user_id: string }
  | { ok: false; error: AddMemberErrorCode }

export async function addOrganizationMemberByEmail(
  sb: SupabaseClient,
  organizationId: string,
  email: string
): Promise<AddMemberResult> {
  const { data, error } = await sb.rpc('add_organization_member_by_email', {
    p_organization_id: organizationId,
    p_email: email.trim(),
  })
  if (error) {
    return { ok: false, error: 'unknown' }
  }
  const j = (data ?? {}) as { ok?: boolean; error?: string; user_id?: string }
  if (j.ok === true && j.user_id) {
    return { ok: true, user_id: String(j.user_id) }
  }
  const code = j.error
  if (
    code === 'not_authenticated' ||
    code === 'invalid_email' ||
    code === 'not_owner' ||
    code === 'user_not_found' ||
    code === 'already_member'
  ) {
    return { ok: false, error: code }
  }
  return { ok: false, error: 'unknown' }
}

export function addMemberErrorMessage(code: AddMemberErrorCode): string {
  switch (code) {
    case 'not_authenticated':
      return 'Sessão expirada; volte a iniciar sessão.'
    case 'invalid_email':
      return 'Indique um e-mail válido.'
    case 'not_owner':
      return 'Só o proprietário da organização pode convidar membros.'
    case 'user_not_found':
      return 'Não existe utilizador registado com este e-mail. A pessoa tem de criar conta primeiro.'
    case 'already_member':
      return 'Este utilizador já pertence à organização.'
    default:
      return 'Não foi possível adicionar o membro. Tente novamente.'
  }
}
