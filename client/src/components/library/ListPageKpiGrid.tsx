import * as React from 'react'
import { cn } from '@/lib/utils'

export type ListPageKpiItem = {
  label: string
  value: React.ReactNode
  /** Classes para o valor (ex.: text-green-700) */
  valueClassName?: string
}

type Props = {
  items: ListPageKpiItem[]
  className?: string
  /** grid-cols base; default 2 sm:4 */
  columnsClassName?: string
}

/**
 * Grelha compacta de KPIs usada em listagens (Clientes, Produtos, etc.).
 */
export function ListPageKpiGrid({ items, className, columnsClassName }: Props) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-2',
        columnsClassName ?? 'sm:grid-cols-4',
        className
      )}
    >
      {items.map((k) => (
        <div key={k.label} className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{k.label}</p>
          <div className={cn('text-lg font-semibold tabular-nums', k.valueClassName)}>{k.value}</div>
        </div>
      ))}
    </div>
  )
}
