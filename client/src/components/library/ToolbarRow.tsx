import * as React from 'react'
import { cn } from '@/lib/utils'

export type ToolbarRowProps = {
  /** Área principal (ex.: busca) */
  start?: React.ReactNode
  /** Ações à direita (ex.: botões) */
  end?: React.ReactNode
  className?: string
}

/**
 * Linha de ferramentas: conteúdo flexível à esquerda, ações à direita.
 * Em `sm+`, usa alinhamento ao topo para que, com várias linhas à esquerda (ex.: busca + filtros),
 * os botões à direita não fiquem centrados na altura total.
 */
export function ToolbarRow({ start, end, className }: ToolbarRowProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3',
        className
      )}
    >
      {start != null && <div className="min-w-0 flex-1">{start}</div>}
      {end != null && <div className="flex shrink-0 flex-wrap items-center gap-2">{end}</div>}
    </div>
  )
}
