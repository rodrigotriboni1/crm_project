import type { OrcamentoStatus } from '@/types/database'

/** Ordem fixa das colunas do Kanban e filtros. */
export const ORCAMENTO_STATUS_ORDER: OrcamentoStatus[] = [
  'novo_contato',
  'orcamento_enviado',
  'dormindo',
  'ganho',
  'perdido',
]

export function orcamentoStatusLabel(s: OrcamentoStatus): string {
  switch (s) {
    case 'novo_contato':
      return 'Novo contato'
    case 'orcamento_enviado':
      return 'Orçamento enviado'
    case 'dormindo':
      return 'Dormindo'
    case 'ganho':
      return 'Ganho'
    case 'perdido':
      return 'Perdido'
    default:
      return s
  }
}
