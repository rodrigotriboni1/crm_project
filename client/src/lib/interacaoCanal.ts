/** Canais que o utilizador pode escolher ao registar uma interação manualmente. */
export const INTERACAO_CANAIS_USUARIO = ['WhatsApp', 'Telefone', 'Presencial'] as const

/** Todos os valores permitidos em `interacoes.canal` (inclui entradas automáticas da RPC). */
export const INTERACAO_CANAIS = [...INTERACAO_CANAIS_USUARIO, 'Sistema'] as const

export type InteracaoCanalUsuario = (typeof INTERACAO_CANAIS_USUARIO)[number]

export type InteracaoCanal = (typeof INTERACAO_CANAIS)[number]

export function isInteracaoCanal(s: string): s is InteracaoCanal {
  return (INTERACAO_CANAIS as readonly string[]).includes(s)
}
