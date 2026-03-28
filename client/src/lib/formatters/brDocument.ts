import { digitsOnly } from './digits'

const MAX_CPF = 11
const MAX_CNPJ = 14

export function formatCpf(digits: string): string {
  const x = digitsOnly(digits).slice(0, MAX_CPF)
  if (!x) return ''
  if (x.length <= 3) return x
  if (x.length <= 6) return `${x.slice(0, 3)}.${x.slice(3)}`
  if (x.length <= 9) return `${x.slice(0, 3)}.${x.slice(3, 6)}.${x.slice(6)}`
  return `${x.slice(0, 3)}.${x.slice(3, 6)}.${x.slice(6, 9)}-${x.slice(9)}`
}

export function formatCnpj(digits: string): string {
  const x = digitsOnly(digits).slice(0, MAX_CNPJ)
  if (!x) return ''
  if (x.length <= 2) return x
  if (x.length <= 5) return `${x.slice(0, 2)}.${x.slice(2)}`
  if (x.length <= 8) return `${x.slice(0, 2)}.${x.slice(2, 5)}.${x.slice(5)}`
  if (x.length <= 12) return `${x.slice(0, 2)}.${x.slice(2, 5)}.${x.slice(5, 8)}/${x.slice(8)}`
  return `${x.slice(0, 2)}.${x.slice(2, 5)}.${x.slice(5, 8)}/${x.slice(8, 12)}-${x.slice(12)}`
}

/** Até 11 dígitos formata como CPF; a partir do 12º, como CNPJ (máx. 14). */
export function formatCpfCnpj(digits: string): string {
  const x = digitsOnly(digits).slice(0, MAX_CNPJ)
  if (x.length <= MAX_CPF) return formatCpf(x)
  return formatCnpj(x)
}

export function parseCpfInput(s: string): string {
  return digitsOnly(s).slice(0, MAX_CPF)
}

export function parseCnpjInput(s: string): string {
  return digitsOnly(s).slice(0, MAX_CNPJ)
}

export function parseCpfCnpjInput(s: string): string {
  return digitsOnly(s).slice(0, MAX_CNPJ)
}
