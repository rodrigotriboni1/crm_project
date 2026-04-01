/**
 * Supabase Auth redirects email/OAuth flows to the app URL with query or hash params.
 * Expired confirmation links use e.g. code=otp_expired and error_description=...
 */

export type AuthRedirectFailure =
  | { kind: 'expired_link' }
  | { kind: 'auth_error'; message: string }

function decodeParam(raw: string | null): string {
  if (!raw) return ''
  try {
    return decodeURIComponent(raw.replace(/\+/g, ' '))
  } catch {
    return raw.replace(/\+/g, ' ')
  }
}

function collectParams(): URLSearchParams {
  const merged = new URLSearchParams(window.location.search)
  const h = window.location.hash.replace(/^#/, '')
  if (h.includes('=')) {
    const fromHash = new URLSearchParams(h)
    fromHash.forEach((v, k) => {
      if (!merged.has(k)) merged.set(k, v)
    })
  }
  return merged
}

const EXPIRED_CODE = new Set(['otp_expired'])

export function parseAuthRedirectFailure(): AuthRedirectFailure | null {
  const p = collectParams()
  const code = p.get('code')
  const error = p.get('error')
  const errorDescription = decodeParam(p.get('error_description'))

  if (code && EXPIRED_CODE.has(code)) {
    return { kind: 'expired_link' }
  }

  if (errorDescription && /expired|invalid.*link|link.*invalid/i.test(errorDescription)) {
    return { kind: 'expired_link' }
  }

  if (error === 'access_denied' && /expired|invalid/i.test(errorDescription)) {
    return { kind: 'expired_link' }
  }

  if (error || errorDescription) {
    return {
      kind: 'auth_error',
      message: errorDescription || error || 'Não foi possível concluir a autenticação.',
    }
  }

  return null
}
