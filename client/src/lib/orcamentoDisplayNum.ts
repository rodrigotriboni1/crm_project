/** Formata o número sequencial do cartão para 8 dígitos (ex.: 00000001). */
export function formatOrcamentoDisplayNum(displayNum: number): string {
  return String(Math.max(0, Math.floor(displayNum))).padStart(8, '0')
}
