/** Mantém apenas dígitos (útil para normalizar antes de gravar ou mascarar). */
export function digitsOnly(s: string): string {
  return s.replace(/\D/g, '')
}
