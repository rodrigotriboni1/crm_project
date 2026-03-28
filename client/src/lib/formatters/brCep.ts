import { digitsOnly } from './digits'

const MAX = 8

export function formatCep(digits: string): string {
  const x = digitsOnly(digits).slice(0, MAX)
  if (!x) return ''
  if (x.length <= 5) return x
  return `${x.slice(0, 5)}-${x.slice(5)}`
}

export function parseCepInput(s: string): string {
  return digitsOnly(s).slice(0, MAX)
}
