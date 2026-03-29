import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API = 'https://api.resend.com/emails'

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/** Valida join_url (http/https, path contém /join); opcionalmente restringe origem. */
function validateJoinUrl(
  raw: string,
  allowedOrigins: string[]
): { ok: true; href: string } | { ok: false; reason: string } {
  const s = typeof raw === 'string' ? raw.trim() : ''
  if (s.length < 12 || s.length > 2048) return { ok: false, reason: 'invalid_join_url' }
  let u: URL
  try {
    u = new URL(s)
  } catch {
    return { ok: false, reason: 'invalid_join_url' }
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') {
    return { ok: false, reason: 'invalid_join_url' }
  }
  if (!u.pathname.includes('/join')) {
    return { ok: false, reason: 'invalid_join_url' }
  }
  if (allowedOrigins.length > 0) {
    const origin = u.origin
    if (!allowedOrigins.includes(origin)) {
      return { ok: false, reason: 'join_url_origin_not_allowed' }
    }
  }
  return { ok: true, href: u.toString() }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json(405, { ok: false, error: 'method_not_allowed' })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json(401, { ok: false, error: 'unauthorized' })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return json(500, { ok: false, error: 'server_misconfigured' })
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser()
    if (authError || !user) {
      return json(401, { ok: false, error: 'unauthorized' })
    }

    const body = (await req.json()) as { invitation_id?: string; join_url?: string }
    const invitationId =
      typeof body.invitation_id === 'string' ? body.invitation_id.trim() : ''
    const joinUrlRaw = typeof body.join_url === 'string' ? body.join_url.trim() : ''
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!invitationId || !uuidRe.test(invitationId)) {
      return json(400, { ok: false, error: 'invitation_id_required' })
    }

    const originsEnv = (Deno.env.get('APP_ALLOWED_ORIGINS') ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean)
    const joinCheck = validateJoinUrl(joinUrlRaw, originsEnv)
    if (!joinCheck.ok) {
      return json(400, { ok: false, error: joinCheck.reason })
    }
    const joinHref = joinCheck.href

    const admin = createClient(supabaseUrl, serviceRoleKey)

    const { data: inv, error: invErr } = await admin
      .from('organization_invitations')
      .select('id, email, organization_id, invited_by, expires_at, accepted_at, revoked_at')
      .eq('id', invitationId)
      .maybeSingle()

    if (invErr || !inv) {
      return json(404, { ok: false, error: 'invitation_not_found' })
    }

    const now = new Date().toISOString()
    if (inv.accepted_at != null || inv.revoked_at != null) {
      return json(400, { ok: false, error: 'invitation_not_sendable' })
    }
    if (inv.expires_at && inv.expires_at < now) {
      return json(400, { ok: false, error: 'invitation_expired' })
    }

    const uid = user.id
    const isInviter = inv.invited_by === uid

    let isOwner = false
    if (!isInviter) {
      const { data: mem } = await admin
        .from('organization_members')
        .select('role')
        .eq('organization_id', inv.organization_id)
        .eq('user_id', uid)
        .eq('role', 'owner')
        .maybeSingle()
      isOwner = Boolean(mem)
    }

    if (!isInviter && !isOwner) {
      return json(403, { ok: false, error: 'forbidden' })
    }

    const { data: org } = await admin
      .from('organizations')
      .select('name')
      .eq('id', inv.organization_id)
      .maybeSingle()

    const orgName = (org?.name as string | undefined)?.trim() || 'Organização'

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) {
      return json(503, { ok: false, error: 'resend_not_configured' })
    }

    const from =
      Deno.env.get('RESEND_FROM')?.trim() || 'EmbalaFlow <onboarding@resend.dev>'
    const to = String(inv.email).trim()
    if (!to.includes('@')) {
      return json(400, { ok: false, error: 'invalid_invitee_email' })
    }

    const subject = `Convite para ${orgName} — EmbalaFlow CRM`
    const safeOrg = escapeHtml(orgName)
    const safeLink = escapeHtml(joinHref)
    const html = `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#1a1a18;">
  <p>Foi convidado(a) para participar na organização <strong>${safeOrg}</strong> no EmbalaFlow CRM.</p>
  <p><a href="${safeLink}" style="display:inline-block;margin-top:8px;padding:10px 16px;background:#ea580c;color:#fff;text-decoration:none;border-radius:6px;">Aceitar convite e criar conta</a></p>
  <p style="font-size:13px;color:#666;">Se o botão não funcionar, copie este link para o navegador:<br/><span style="word-break:break-all;">${safeLink}</span></p>
  <p style="font-size:12px;color:#999;">Este convite expira em breve. Se não esperava este e-mail, ignore.</p>
</body></html>`

    const resendRes = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
      }),
    })

    if (!resendRes.ok) {
      let detail = resendRes.statusText
      try {
        const j = (await resendRes.json()) as { message?: string; error?: string }
        detail = j.message ?? j.error ?? detail
      } catch {
        detail = await resendRes.text()
      }
      console.error('Resend error:', resendRes.status, detail)
      return json(502, { ok: false, error: 'resend_failed' })
    }

    return json(200, { ok: true })
  } catch (e) {
    console.error(e)
    return json(500, { ok: false, error: 'internal_error' })
  }
})
