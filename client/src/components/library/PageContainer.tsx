import * as React from 'react'
import { cn } from '@/lib/utils'

const maxWidthClass = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-full',
} as const

export type PageContainerMax = keyof typeof maxWidthClass

export type PageContainerProps = {
  children: React.ReactNode
  className?: string
  /** Largura máxima do conteúdo da página */
  max?: PageContainerMax
}

/**
 * Padding e largura máxima padrão para páginas internas do CRM.
 */
export function PageContainer({ children, className, max = 'xl' }: PageContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-full px-4 py-4 sm:px-6 sm:py-6',
        maxWidthClass[max],
        className
      )}
    >
      {children}
    </div>
  )
}
