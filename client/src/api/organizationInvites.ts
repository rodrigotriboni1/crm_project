import type { SupabaseClient } from '@supabase/supabase-js'

export type InviteOrAddMode = 'added_existing' | 'invited'

export type InviteOrAddResult =
  | { ok: true; mode: 'added_existing'; user_id: string }
  | { ok: true; mode: 'invited'; invite_id: string; token: string }
  | { ok: false; error: InviteOrAddErrorCode }

export type InviteOrAddErrorCode =
  | 'not_authenticated'
  | 'invalid_email'
  | 'not_owner'
  | 'already_member'
  | 'invite_conflict'
  | 'unknown'

export async function inviteOrAddOrganizationMember(
  sb: SupabaseClient,
  organizationId: string,
  email: string
): Promise<InviteOrAddResult> {
  const { data, error } = await sb.rpc('invite_or_add_organization_member', {
    p_organization_id: organizationId,
    p_email: email.trim(),
  })
  if (error) {
    return { ok: false, error: 'unknown' }
  }
  const j = (data ?? {}) as {
    ok?: boolean
    error?: string
    mode?: string
    user_id?: string
    invite_id?: string
    token?: string
  }
  if (j.ok === true && j.mode === 'added_existing' && j.user_id) {
    return { ok: true, mode: 'added_existing', user_id: String(j.user_id) }
  }
  if (j.ok === true && j.mode === 'invited' && j.invite_id && j.token) {
    return {
      ok: true,
      mode: 'invited',
      invite_id: String(j.invite_id),
      token: String(j.token),
    }
  }
  const code = j.error
  if (
    code === 'not_authenticated' ||
    code === 'invalid_email' ||
    code === 'not_owner' ||
    code === 'already_member' ||
    code === 'invite_conflict'
  ) {
    return { ok: false, error: code }
  }
  return { ok: false, error: 'unknown' }
}

export function inviteOrAddErrorMessage(code: InviteOrAddErrorCode): string {
  switch (code) {
    case 'not_authenticated':
      return 'Sessão expirada; volte a iniciar sessão.'
    case 'invalid_email':
      return 'Indique um e-mail válido.'
    case 'not_owner':
      return 'Só o proprietário pode convidar.'
    case 'already_member':
      return 'Este utilizador já pertence à organização.'
    case 'invite_conflict':
      return 'Não foi possível criar o convite. Tente novamente.'
    default:
      return 'Não foi possível concluir o convite. Tente novamente.'
  }
}

export type OrganizationInviteRow = {
  id: string
  email: string
  status: 'pending' | 'accepted' | 'revoked' | 'expired'
  created_at: string
  expires_at: string
  accepted_at: string | null
  invited_by_email: string | null
}

export async function listOrganizationInvitations(
  sb: SupabaseClient,
  organizationId: string
): Promise<OrganizationInviteRow[]> {
  const { data, error } = await sb.rpc('list_organization_invitations', {
    p_organization_id: organizationId,
  })
  if (error) throw error
  const raw = data as unknown
  if (!Array.isArray(raw)) return []
  return raw.map((row) => {
    const r = row as Record<string, unknown>
    const status = r.status as string
    return {
      id: String(r.id ?? ''),
      email: String(r.email ?? ''),
      status:
        status === 'accepted' || status === 'revoked' || status === 'expired' || status === 'pending'
          ? status
          : 'pending',
      created_at: String(r.created_at ?? ''),
      expires_at: String(r.expires_at ?? ''),
      accepted_at: r.accepted_at != null ? String(r.accepted_at) : null,
      invited_by_email: r.invited_by_email != null ? String(r.invited_by_email) : null,
    }
  })
}

export type RevokeInviteResult =
  | { ok: true }
  | { ok: false; error: RevokeInviteErrorCode }

export type RevokeInviteErrorCode =
  | 'not_authenticated'
  | 'not_found'
  | 'not_owner'
  | 'not_revokable'
  | 'unknown'

export async function revokeOrganizationInvitation(
  sb: SupabaseClient,
  invitationId: string
): Promise<RevokeInviteResult> {
  const { data, error } = await sb.rpc('revoke_organization_invitation', {
    p_invitation_id: invitationId,
  })
  if (error) {
    return { ok: false, error: 'unknown' }
  }
  const j = (data ?? {}) as { ok?: boolean; error?: string }
  if (j.ok === true) return { ok: true }
  const code = j.error
  if (
    code === 'not_authenticated' ||
    code === 'not_found' ||
    code === 'not_owner' ||
    code === 'not_revokable'
  ) {
    return { ok: false, error: code }
  }
  return { ok: false, error: 'unknown' }
}

export function revokeInviteErrorMessage(code: RevokeInviteErrorCode): string {
  switch (code) {
    case 'not_authenticated':
      return 'Sessão expirada.'
    case 'not_found':
      return 'Convite não encontrado.'
    case 'not_owner':
      return 'Só o proprietário pode revogar convites.'
    case 'not_revokable':
      return 'Este convite já não pode ser revogado.'
    default:
      return 'Não foi possível revogar o convite.'
  }
}

export type PreviewInviteResult =
  | { ok: true; organization_name: string; email: string }
  | { ok: false; error: PreviewInviteErrorCode }

export type PreviewInviteErrorCode =
  | 'invalid_token'
  | 'invalid_or_expired'
  | 'unknown'

export async function previewOrganizationInvitation(
  sb: SupabaseClient,
  token: string
): Promise<PreviewInviteResult> {
  const { data, error } = await sb.rpc('preview_organization_invitation', {
    p_token: token.trim(),
  })
  if (error) {
    return { ok: false, error: 'unknown' }
  }
  const j = (data ?? {}) as {
    ok?: boolean
    error?: string
    organization_name?: string
    email?: string
  }
  if (j.ok === true && j.organization_name != null && j.email != null) {
    return {
      ok: true,
      organization_name: String(j.organization_name),
      email: String(j.email),
    }
  }
  const code = j.error
  if (code === 'invalid_token' || code === 'invalid_or_expired') {
    return { ok: false, error: code }
  }
  return { ok: false, error: 'unknown' }
}

export function previewInviteErrorMessage(code: PreviewInviteErrorCode): string {
  switch (code) {
    case 'invalid_token':
      return 'Link de convite inválido.'
    case 'invalid_or_expired':
      return 'Este convite expirou ou já não é válido.'
    default:
      return 'Não foi possível validar o convite.'
  }
}

export type SendInviteEmailErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'invitation_not_found'
  | 'invitation_not_sendable'
  | 'invitation_expired'
  | 'invalid_join_url'
  | 'join_url_origin_not_allowed'
  | 'resend_not_configured'
  | 'resend_failed'
  | 'network'
  | 'unknown'

function mapSendInviteEmailError(raw: string | undefined): SendInviteEmailErrorCode {
  switch (raw) {
    case 'unauthorized':
      return 'unauthorized'
    case 'forbidden':
      return 'forbidden'
    case 'invitation_not_found':
      return 'invitation_not_found'
    case 'invitation_not_sendable':
      return 'invitation_not_sendable'
    case 'invitation_expired':
      return 'invitation_expired'
    case 'invalid_join_url':
    case 'invitation_id_required':
      return 'invalid_join_url'
    case 'join_url_origin_not_allowed':
      return 'join_url_origin_not_allowed'
    case 'resend_not_configured':
      return 'resend_not_configured'
    case 'resend_failed':
      return 'resend_failed'
    case 'network':
      return 'network'
    default:
      return 'unknown'
  }
}

/** Edge Function `send-org-invite-email` (Resend). Requer segredos no Supabase. */
export async function sendOrganizationInviteEmail(
  sb: SupabaseClient,
  params: { invitationId: string; joinUrl: string }
): Promise<
  { ok: true } | { ok: false; error: SendInviteEmailErrorCode; message?: string }
> {
  const { data, error } = await sb.functions.invoke('send-org-invite-email', {
    body: {
      invitation_id: params.invitationId,
      join_url: params.joinUrl,
    },
  })

  const fromBody = (v: unknown): { ok?: boolean; error?: string; detail?: string } | null =>
    v != null && typeof v === 'object' ? (v as { ok?: boolean; error?: string; detail?: string }) : null

  const parsed = fromBody(data)
  if (!error && parsed?.ok === true) {
    return { ok: true }
  }

  let codeRaw = parsed?.error
  if (error) {
    const ctx = (error as { context?: { body?: string } }).context
    if (ctx?.body) {
      try {
        const j = JSON.parse(ctx.body) as { error?: string; detail?: string }
        codeRaw = j.error ?? codeRaw
        if (parsed && !parsed.detail && j.detail) {
          return { ok: false, error: mapSendInviteEmailError(codeRaw), message: j.detail }
        }
      } catch {
        /* ignore */
      }
    }
    if (!codeRaw) codeRaw = 'network'
  }

  return {
    ok: false,
    error: mapSendInviteEmailError(codeRaw),
    message: parsed?.detail,
  }
}

export function sendInviteEmailErrorMessage(code: SendInviteEmailErrorCode): string {
  switch (code) {
    case 'unauthorized':
      return 'Sessão inválida; volte a iniciar sessão.'
    case 'forbidden':
      return 'Não tem permissão para enviar este convite.'
    case 'invitation_not_found':
      return 'Convite não encontrado.'
    case 'invitation_not_sendable':
      return 'Este convite já foi aceite ou revogado.'
    case 'invitation_expired':
      return 'Este convite expirou. Gere um novo link.'
    case 'invalid_join_url':
      return 'Link inválido. Gere o convite de novo.'
    case 'join_url_origin_not_allowed':
      return 'O link não corresponde ao domínio permitido (APP_ALLOWED_ORIGINS no servidor).'
    case 'resend_not_configured':
      return 'Envio por e-mail não está configurado no servidor (RESEND_API_KEY).'
    case 'resend_failed':
      return 'O serviço de e-mail recusou o envio. Verifique o domínio/remetente na Resend.'
    case 'network':
      return 'Não foi possível contactar o servidor. Tente novamente.'
    default:
      return 'Não foi possível enviar o e-mail.'
  }
}

/** URL completa para partilhar (requer `window` no cliente). */
export function buildJoinUrl(token: string): string {
  if (typeof window === 'undefined') {
    return `/join?token=${encodeURIComponent(token)}`
  }
  const u = new URL('/join', window.location.origin)
  u.searchParams.set('token', token)
  return u.toString()
}
