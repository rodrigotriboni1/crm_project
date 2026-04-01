import type { OrcamentoStatus } from '@/types/database'
import { orcamentoStatusLabel } from '@/lib/orcamentoStatusUi'
import { KANBAN_STATUS_BADGE_PILL } from '@/lib/kanbanPhaseUi'
import { cn } from '@/lib/utils'

type Props = {
  status: OrcamentoStatus
  className?: string
}

/** Pill de fase com cores do token Kanban (Pipefy). */
export default function PhaseBadge({ status, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center truncate rounded-[20px] border-0 px-2.5 py-0.5 font-heading text-xs font-medium',
        KANBAN_STATUS_BADGE_PILL[status],
        className
      )}
    >
      {orcamentoStatusLabel(status)}
    </span>
  )
}
