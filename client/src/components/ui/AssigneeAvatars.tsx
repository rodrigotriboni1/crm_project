import { cn } from '@/lib/utils'

export type AssigneeAvatarItem = {
  initials: string
  /** Classes de fundo (ex. token ou bg-blue-500) */
  ringClass?: string
}

type Props = {
  assignees: AssigneeAvatarItem[]
  className?: string
}

const defaultRing = 'bg-brand-blue text-white ring-card dark:ring-card'

/** Avatares circulares 22px com sobreposição -6px. */
export default function AssigneeAvatars({ assignees, className }: Props) {
  if (assignees.length === 0) return null

  return (
    <div className={cn('flex items-center', className)}>
      {assignees.map((a, i) => (
        <span
          key={i}
          className={cn(
            'flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full font-heading text-[9px] font-semibold ring-2 ring-card dark:ring-card',
            i > 0 && '-ml-1.5',
            a.ringClass ?? defaultRing
          )}
          aria-hidden={assignees.length > 1 ? true : undefined}
        >
          {a.initials.slice(0, 2).toUpperCase()}
        </span>
      ))}
    </div>
  )
}
