import type { OrcamentoStatus } from '@/types/database'

/** Mapeamento BD → tokens visuais Pipefy (ver `index.css` @theme). */
export const KANBAN_STATUS_HEADER_BG: Record<OrcamentoStatus, string> = {
  novo_contato: 'bg-phase-prospect-bg',
  orcamento_enviado: 'bg-phase-proposal-bg',
  dormindo: 'bg-phase-closing-bg',
  ganho: 'bg-phase-won-bg',
  perdido: 'bg-phase-lost-bg',
}

export const KANBAN_STATUS_DOT: Record<OrcamentoStatus, string> = {
  novo_contato: 'bg-phase-prospect-dot',
  orcamento_enviado: 'bg-phase-proposal-dot',
  dormindo: 'bg-phase-closing-dot',
  ganho: 'bg-phase-won-dot',
  perdido: 'bg-phase-lost-dot',
}

/** Barra inferior do cartão = cor do dot da fase. */
export const KANBAN_STATUS_CARD_BAR: Record<OrcamentoStatus, string> = KANBAN_STATUS_DOT

export const KANBAN_STATUS_BADGE_PILL: Record<OrcamentoStatus, string> = {
  novo_contato: 'bg-phase-prospect-badge text-phase-prospect-text',
  orcamento_enviado: 'bg-phase-proposal-badge text-phase-proposal-text',
  dormindo: 'bg-phase-closing-badge text-phase-closing-text',
  ganho: 'bg-phase-won-badge text-phase-won-text',
  perdido: 'bg-phase-lost-badge text-phase-lost-text',
}
