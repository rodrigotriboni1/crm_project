import * as React from 'react'
import { cn } from '@/lib/utils'

export type FormStackProps = {
  children: React.ReactNode
  className?: string
}

/**
 * Espaçamento vertical padrão entre campos de formulário.
 */
export function FormStack({ children, className }: FormStackProps) {
  return <div className={cn('grid gap-3', className)}>{children}</div>
}
