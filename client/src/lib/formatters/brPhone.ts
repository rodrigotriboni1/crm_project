import { digitsOnly } from './digits'

const MAX = 11

/**
 * Telefone nacional BR: (DD) 9XXXX-XXXX (11 dígitos) ou (DD) XXXX-XXXX (10).
 * `digits` deve conter só números (estado normalizado).
 */
export function formatBrazilPhone(digits: string): string {
  const x = digitsOnly(digits).slice(0, MAX)
  if (!x) return ''
  if (x.length <= 2) return `(${x}`
  const ddd = x.slice(0, 2)
  const rest = x.slice(2)
  const prefix = `(${ddd})`
  if (rest.length === 0) return prefix
  const isMobile = rest[0] === '9'
  const body = `${prefix} ${rest}`
  if (isMobile) {
    if (rest.length <= 5) return body
    return `${prefix} ${rest.slice(0, 5)}-${rest.slice(5, 9)}`
  }
  if (rest.length <= 4) return body
  return `${prefix} ${rest.slice(0, 4)}-${rest.slice(4, 8)}`
}

/** A partir do texto do input (com máscara), devolve só dígitos, até 11. */
export function parseBrazilPhoneInput(displayOrRaw: string): string {
  return digitsOnly(displayOrRaw).slice(0, MAX)
}
