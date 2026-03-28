import * as React from 'react'
import { cn } from '@/lib/utils'

export type EmptyStateProps = {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

/**
 * Estado vazio para listas, tabelas ou secções sem dados.
 */
export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 py-10 px-4 text-center',
        className
      )}
    >
      {icon && <div className="text-muted-foreground [&_svg]:size-10">{icon}</div>}
      <p className="font-sans text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="pt-2">{action}</div>}
    </div>
  )
}
