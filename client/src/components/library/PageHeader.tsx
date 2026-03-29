import * as React from 'react'
import { cn } from '@/lib/utils'

export type PageHeaderProps = {
  title: string
  description?: string
  /** Ações à direita (uma primária + secundárias em outline/ghost) */
  actions?: React.ReactNode
  className?: string
}

/**
 * Cabeçalho opcional quando o título **não** repete o item de navegação nem serve só de slogan.
 *
 * Evitar: título = nome da rota (ex. «Dashboard», «Clientes») + descrição genérica de marketing —
 * a sidebar já identifica o sítio; isso só ocupa espaço. Preferir ir directo ao conteúdo (KPIs,
 * tabela, filtros) ou usar `SectionCard` / `ToolbarRow` com acções.
 *
 * Usar com critério: ex. detalhe de entidade (nome do cliente), ou página sem equivalente claro na nav.
 */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6',
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <h1 className="font-sans text-xl font-semibold tracking-tight text-brand-dark sm:text-2xl">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions != null && actions !== false ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  )
}
