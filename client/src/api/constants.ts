import type { OrcamentoStatus } from '@/types/database'

export const FUNIL: OrcamentoStatus[] = ['novo_contato', 'orcamento_enviado', 'dormindo']

/** Orçamentos com follow-up agendado aparecem na fila do dashboard se a data for até N dias à frente (e todos os atrasados). */
export const FOLLOW_UP_ALERT_WINDOW_DAYS = 7
