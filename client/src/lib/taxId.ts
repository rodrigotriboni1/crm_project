import { isValidCnpjDigits, isValidCpfDigits } from '@/lib/brCpfCnpj'
import { digitsOnly } from '@/lib/formatters'

/**
 * CPF (11) ou CNPJ (14) só com dígitos válidos pelos verificadores; inválido ou vazio → null.
 */
export function normalizeClienteTaxId(raw: string | null | undefined): string | null {
  if (raw == null || !String(raw).trim()) return null
  const d = digitsOnly(String(raw))
  if (d.length === 11) return isValidCpfDigits(d) ? d : null
  if (d.length === 14) return isValidCnpjDigits(d) ? d : null
  return null
}

/**
 * Mensagem para validação em formulários; `null` = sem erro (vazio ou ainda incompleto).
 */
export function describeClienteTaxIdInputError(raw: string | null | undefined): string | null {
  if (raw == null || !String(raw).trim()) return null
  const d = digitsOnly(String(raw))
  if (d.length === 0) return null
  if (d.length < 11) return 'CPF/CNPJ incompleto.'
  if (d.length === 11) return isValidCpfDigits(d) ? null : 'CPF inválido (dígitos verificadores).'
  if (d.length < 14) return 'CNPJ incompleto (são 14 dígitos).'
  if (d.length === 14) return isValidCnpjDigits(d) ? null : 'CNPJ inválido (dígitos verificadores).'
  return 'Use no máximo 14 dígitos (CPF ou CNPJ).'
}
