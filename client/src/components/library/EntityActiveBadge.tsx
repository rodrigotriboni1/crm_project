import { cn } from '@/lib/utils'

type Props = {
  active: boolean
  activeLabel?: string
  inactiveLabel?: string
  className?: string
}

/**
 * Pill Ativo / Arquivado alinhado a produtos e clientes.
 */
export function EntityActiveBadge({
  active,
  activeLabel = 'Ativo',
  inactiveLabel = 'Arquivado',
  className,
}: Props) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        active
          ? 'border-green-200 bg-green-50 text-green-700'
          : 'border-muted bg-muted/40 text-muted-foreground',
        className
      )}
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  )
}
