import type { SupabaseClient } from '@supabase/supabase-js'

function coerceJsonbArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  if (typeof data === 'string') {
    try {
      const parsed: unknown = JSON.parse(data)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

export async function updateMemberDataScope(
  sb: SupabaseClient,
  organizationId: string,
  targetUserId: string,
  dataScope: 'organization' | 'own'
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await sb.rpc('update_organization_member_data_scope', {
    p_organization_id: organizationId,
    p_target_user_id: targetUserId,
    p_data_scope: dataScope,
  })
  if (error) return { ok: false, error: 'unknown' }
  const j = (data ?? {}) as { ok?: boolean; error?: string }
  return j.ok === true ? { ok: true } : { ok: false, error: String(j.error ?? 'unknown') }
}

export async function removeOrganizationMember(
  sb: SupabaseClient,
  organizationId: string,
  targetUserId: string,
  reassignUserId: string | null
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await sb.rpc('remove_organization_member', {
    p_organization_id: organizationId,
    p_target_user_id: targetUserId,
    p_reassign_user_id: reassignUserId,
  })
  if (error) return { ok: false, error: 'unknown' }
  const j = (data ?? {}) as { ok?: boolean; error?: string }
  return j.ok === true ? { ok: true } : { ok: false, error: String(j.error ?? 'unknown') }
}

export type AuditLogRow = {
  id: string
  action: string
  target_user_id: string | null
  detail: unknown
  created_at: string
  actor_email: string | null
}

export async function listOrganizationAuditLog(
  sb: SupabaseClient,
  organizationId: string,
  limit = 80
): Promise<AuditLogRow[]> {
  const { data, error } = await sb.rpc('list_organization_audit_log', {
    p_organization_id: organizationId,
    p_limit: limit,
  })
  if (error) throw error
  const raw = coerceJsonbArray(data)
  return raw.map((row) => {
    const r = row as Record<string, unknown>
    return {
      id: String(r.id ?? ''),
      action: String(r.action ?? ''),
      target_user_id: r.target_user_id != null ? String(r.target_user_id) : null,
      detail: r.detail,
      created_at: String(r.created_at ?? ''),
      actor_email: r.actor_email != null ? String(r.actor_email) : null,
    }
  })
}
