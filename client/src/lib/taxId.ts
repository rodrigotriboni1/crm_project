import { digitsOnly } from '@/lib/formatters'

/** CPF (11) ou CNPJ (14) apenas dígitos; inválido ou vazio → null. */
export function normalizeClienteTaxId(raw: string | null | undefined): string | null {
  if (raw == null || !String(raw).trim()) return null
  const d = digitsOnly(String(raw))
  if (d.length === 11 || d.length === 14) return d
  return null
}
