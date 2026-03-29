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

export type TeamRow = {
  id: string
  organization_id: string
  name: string
  leader_user_id: string | null
  is_active: boolean
  created_at: string
  member_count: number
}

export async function listTeams(sb: SupabaseClient, organizationId: string): Promise<TeamRow[]> {
  const { data, error } = await sb.rpc('list_teams', { p_organization_id: organizationId })
  if (error) throw error
  const raw = coerceJsonbArray(data)
  return raw.map((row) => {
    const r = row as Record<string, unknown>
    return {
      id: String(r.id ?? ''),
      organization_id: String(r.organization_id ?? ''),
      name: String(r.name ?? ''),
      leader_user_id: r.leader_user_id != null ? String(r.leader_user_id) : null,
      is_active: Boolean(r.is_active),
      created_at: String(r.created_at ?? ''),
      member_count: Number(r.member_count ?? 0),
    }
  })
}

export type CreateTeamResult = { ok: true; team_id: string } | { ok: false; error: string }

export async function createTeam(
  sb: SupabaseClient,
  organizationId: string,
  name: string
): Promise<CreateTeamResult> {
  const { data, error } = await sb.rpc('create_team', {
    p_organization_id: organizationId,
    p_name: name.trim(),
  })
  if (error) return { ok: false, error: 'unknown' }
  const j = (data ?? {}) as { ok?: boolean; error?: string; team_id?: string }
  if (j.ok === true && j.team_id) return { ok: true, team_id: String(j.team_id) }
  return { ok: false, error: String(j.error ?? 'unknown') }
}

export async function deleteTeam(sb: SupabaseClient, teamId: string): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await sb.rpc('delete_team', { p_team_id: teamId })
  if (error) return { ok: false, error: 'unknown' }
  const j = (data ?? {}) as { ok?: boolean; error?: string }
  return j.ok === true ? { ok: true } : { ok: false, error: String(j.error ?? 'unknown') }
}

export type TeamMemberRow = {
  user_id: string
  email: string | null
  full_name: string | null
  status: string
  max_open_leads: number | null
  joined_at: string
}

export async function listTeamMembers(sb: SupabaseClient, teamId: string): Promise<TeamMemberRow[]> {
  const { data, error } = await sb.rpc('list_team_members', { p_team_id: teamId })
  if (error) throw error
  const raw = coerceJsonbArray(data)
  return raw.map((row) => {
    const r = row as Record<string, unknown>
    return {
      user_id: String(r.user_id ?? ''),
      email: r.email != null ? String(r.email) : null,
      full_name: r.full_name != null ? String(r.full_name) : null,
      status: String(r.status ?? 'active'),
      max_open_leads: r.max_open_leads != null ? Number(r.max_open_leads) : null,
      joined_at: String(r.joined_at ?? ''),
    }
  })
}

export async function addTeamMemberByEmail(
  sb: SupabaseClient,
  teamId: string,
  email: string
): Promise<{ ok: true; user_id: string } | { ok: false; error: string }> {
  const { data, error } = await sb.rpc('add_team_member_by_email', {
    p_team_id: teamId,
    p_email: email.trim(),
  })
  if (error) return { ok: false, error: 'unknown' }
  const j = (data ?? {}) as { ok?: boolean; error?: string; user_id?: string }
  if (j.ok === true && j.user_id) return { ok: true, user_id: String(j.user_id) }
  return { ok: false, error: String(j.error ?? 'unknown') }
}

export async function removeTeamMember(
  sb: SupabaseClient,
  teamId: string,
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await sb.rpc('remove_team_member', {
    p_team_id: teamId,
    p_user_id: userId,
  })
  if (error) return { ok: false, error: 'unknown' }
  const j = (data ?? {}) as { ok?: boolean; error?: string }
  return j.ok === true ? { ok: true } : { ok: false, error: String(j.error ?? 'unknown') }
}
