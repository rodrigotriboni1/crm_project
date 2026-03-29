import { digitsOnly } from '@/lib/formatters'

const MIN_NATIONAL = 10
const MAX_NATIONAL = 11

/**
 * Normaliza para dígitos com código do país BR (55 + DDD + número).
 * Aceita 10–11 dígitos nacionais ou já iniciando em 55.
 */
export function brazilPhoneDigitsForLinks(raw: string): string | null {
  const d = digitsOnly(raw)
  if (!d) return null
  if (d.startsWith('55')) {
    if (d.length >= 12 && d.length <= 13) return d
    return null
  }
  if (d.length >= MIN_NATIONAL && d.length <= MAX_NATIONAL) {
    return `55${d}`
  }
  return null
}

export function telHrefBrazil(raw: string): string | null {
  const full = brazilPhoneDigitsForLinks(raw)
  if (!full) return null
  return `tel:+${full}`
}

/** Abre o app WhatsApp com o número (formato wa.me). */
export function whatsappHrefBrazil(raw: string): string | null {
  const full = brazilPhoneDigitsForLinks(raw)
  if (!full) return null
  return `https://wa.me/${full}`
}
