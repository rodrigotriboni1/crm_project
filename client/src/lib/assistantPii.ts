/**
 * Minimização de PII e texto livre enviados ao assistente (terceiro / LLM).
 */

export const ASSISTANT_DEFAULT_MAX_NOTE = 280
export const ASSISTANT_DEFAULT_MAX_OBS = 200
export const ASSISTANT_DEFAULT_MAX_LOST_REASON = 120

export function clipAssistantText(s: string, max: number): string {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

/**
 * Máscara CPF/CNPJ (só dígitos) para contexto do modelo: evita enviar documento completo.
 */
export function maskTaxIdForAssistant(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const d = String(raw).replace(/\D/g, '')
  if (d.length === 0) return null
  if (d.length === 11) return `***.***.***-${d.slice(-2)}`
  if (d.length === 14) return `**.***.***/****-${d.slice(-2)}`
  return '[documento]'
}
