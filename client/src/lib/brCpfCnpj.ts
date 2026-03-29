/**
 * Validação de CPF e CNPJ brasileiros (dígitos verificadores).
 * Referência: algoritmo oficial (módulo 11).
 */

function allSameDigit(d: string): boolean {
  return /^(\d)\1+$/.test(d)
}

/** `d` deve ter exatamente 11 caracteres numéricos. */
export function isValidCpfDigits(d: string): boolean {
  if (d.length !== 11 || allSameDigit(d)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]!, 10) * (10 - i)
  let mod = (sum * 10) % 11
  if (mod === 10 || mod === 11) mod = 0
  if (mod !== parseInt(d[9]!, 10)) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]!, 10) * (11 - i)
  mod = (sum * 10) % 11
  if (mod === 10 || mod === 11) mod = 0
  return mod === parseInt(d[10]!, 10)
}

const CNPJ_W12 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const
const CNPJ_W13 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const

function cnpjCheckDigit(base: string, weights: readonly number[]): number {
  let sum = 0
  for (let i = 0; i < weights.length; i++) {
    sum += parseInt(base[i]!, 10) * weights[i]!
  }
  const r = sum % 11
  return r < 2 ? 0 : 11 - r
}

/** `d` deve ter exatamente 14 caracteres numéricos. */
export function isValidCnpjDigits(d: string): boolean {
  if (d.length !== 14 || allSameDigit(d)) return false
  const d12 = cnpjCheckDigit(d.slice(0, 12), CNPJ_W12)
  if (d12 !== parseInt(d[12]!, 10)) return false
  const d13 = cnpjCheckDigit(d.slice(0, 13), CNPJ_W13)
  return d13 === parseInt(d[13]!, 10)
}

export function isValidBrTaxIdDigits(d: string): boolean {
  if (d.length === 11) return isValidCpfDigits(d)
  if (d.length === 14) return isValidCnpjDigits(d)
  return false
}
