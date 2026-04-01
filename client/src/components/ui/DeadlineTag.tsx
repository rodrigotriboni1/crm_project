import { cn } from '@/lib/utils'

function startOfToday(): number {
  return new Date(new Date().toDateString()).getTime()
}

function parseFollowUp(dateStr: string): number {
  return new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`).getTime()
}

export type DeadlineUrgency = 'overdue' | 'today' | 'soon' | 'ok'

export function getDeadlineUrgency(followUpAt: string | null | undefined): DeadlineUrgency | null {
  if (!followUpAt) return null
  const t = parseFollowUp(followUpAt)
  if (Number.isNaN(t)) return null
  const today = startOfToday()
  const diffDays = (t - today) / 86400000
  if (diffDays < 0) return 'overdue'
  if (diffDays === 0) return 'today'
  if (diffDays > 0 && diffDays <= 7) return 'soon'
  return 'ok'
}

type Props = {
  followUpAt: string | null | undefined
  /** rótulo curto, ex. dd/mm */
  label: string
  className?: string
}

/** Tag de prazo com cor automática (vencido / hoje / 7 dias / saudável). */
export default function DeadlineTag({ followUpAt, label, className }: Props) {
  const u = getDeadlineUrgency(followUpAt)
  if (!u) return null

  const styles =
    u === 'overdue' || u === 'today'
      ? 'bg-[var(--color-kanban-deadline-overdue-bg)] text-[var(--color-kanban-deadline-overdue-text)]'
      : u === 'soon'
        ? 'bg-[var(--color-kanban-deadline-soon-bg)] text-[var(--color-kanban-deadline-soon-text)]'
        : 'bg-[var(--color-kanban-deadline-ok-bg)] text-[var(--color-kanban-deadline-ok-text)]'

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-[20px] px-2 py-0.5 font-heading text-[10px] font-medium leading-tight',
        styles,
        className
      )}
    >
      {label}
    </span>
  )
}
