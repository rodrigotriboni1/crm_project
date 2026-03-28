import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type SectionCardProps = {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
  contentClassName?: string
  /** Cabeçalho com ações (ex.: botão “Novo”) */
  action?: React.ReactNode
}

/**
 * Cartão de secção com título opcional, alinhado ao resto do CRM.
 */
export function SectionCard({
  title,
  description,
  children,
  className,
  contentClassName,
  action,
}: SectionCardProps) {
  const hasHeader = title != null || description != null || action != null

  return (
    <Card className={cn('border shadow-none', className)}>
      {hasHeader && (
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0 p-4 pb-2">
          <div className="min-w-0 space-y-1">
            {title != null && <CardTitle className="font-sans text-base">{title}</CardTitle>}
            {description != null && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {action != null && <div className="shrink-0">{action}</div>}
        </CardHeader>
      )}
      <CardContent
        className={cn(hasHeader ? 'p-4 pt-2' : 'p-6 pt-4', contentClassName)}
      >
        {children}
      </CardContent>
    </Card>
  )
}
