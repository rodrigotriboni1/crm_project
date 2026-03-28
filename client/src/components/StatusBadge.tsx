import { cn } from '@/lib/utils'
import { orcamentoStatusLabel } from '@/hooks/useCrm'
import type { OrcamentoStatus } from '@/types/database'

/** Tailwind classes for status pills */
export const STATUS_BADGE_STYLES: Record<OrcamentoStatus, string> = {
  novo_contato: 'border-blue-200 bg-blue-50 text-blue-700',
  orcamento_enviado: 'border-sky-200 bg-sky-50 text-sky-700',
  dormindo: 'border-amber-200 bg-amber-50 text-amber-700',
  ganho: 'border-green-200 bg-green-50 text-green-700',
  perdido: 'border-red-200 bg-red-50 text-red-700',
}

/** Left border accent for Kanban column headers */
export const STATUS_COLUMN_BORDER: Record<OrcamentoStatus, string> = {
  novo_contato: 'border-l-blue-500',
  orcamento_enviado: 'border-l-sky-500',
  dormindo: 'border-l-amber-500',
  ganho: 'border-l-green-500',
  perdido: 'border-l-red-500',
}

/** Top border accent for Kanban columns (sem borda lateral) */
export const STATUS_COLUMN_TOP: Record<OrcamentoStatus, string> = {
  novo_contato: 'border-t-blue-500',
  orcamento_enviado: 'border-t-sky-500',
  dormindo: 'border-t-amber-500',
  ganho: 'border-t-green-500',
  perdido: 'border-t-gray-400',
}

type Props = {
  status: OrcamentoStatus
  className?: string
}

export default function StatusBadge({ status, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 font-sans text-xs font-medium',
        STATUS_BADGE_STYLES[status],
        className
      )}
    >
      {orcamentoStatusLabel(status)}
    </span>
  )
}
