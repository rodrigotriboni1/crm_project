/** URL absoluta para o callback de confirmação de e-mail (Supabase redirect). */
export function getAuthEmailRedirectTo(): string {
  if (typeof window === 'undefined') return ''
  const base = import.meta.env.BASE_URL
  const path =
    base === '/' ? '/auth/callback' : `${base.replace(/\/$/, '')}/auth/callback`
  return `${window.location.origin}${path}`
}
