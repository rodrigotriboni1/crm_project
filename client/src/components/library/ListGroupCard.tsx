import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'

type Props = {
  title: string
  subtitle?: string
  children: ReactNode
}

/**
 * Cartão com cabeçalho de secção (categoria, grupo, etc.) e lista sem padding no conteúdo.
 */
export function ListGroupCard({ title, subtitle, children }: Props) {
  return (
    <Card className="border shadow-none">
      <div className="border-b border-border/60 bg-muted/30 px-4 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        {subtitle != null && subtitle !== '' && (
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  )
}
