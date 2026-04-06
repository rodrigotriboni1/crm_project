/**
 * URL embebida no e-mail de confirmação (Supabase `emailRedirectTo`).
 * Em produção define `VITE_PUBLIC_APP_URL` no build (ex.: Vercel) com a URL pública
 * (https://app.seudominio.com) para os links nunca apontarem para localhost.
 * Sem variável: usa o origin atual (útil em dev e em previews).
 */
export function getAuthEmailRedirectTo(): string {
  const fromEnv = (import.meta.env.VITE_PUBLIC_APP_URL ?? '').trim().replace(/\/$/, '')
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const base = fromEnv || origin
  return `${base}/auth/callback`
}
