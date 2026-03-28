import * as React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type Props = {
  children: React.ReactNode
  className?: string
  minWidthClassName?: string
}

/**
 * Tabela dentro de Card com scroll horizontal (padrão Produtos / futuras listagens).
 */
export function SimpleDataTable({ children, className, minWidthClassName = 'min-w-[520px]' }: Props) {
  return (
    <Card className={cn('border shadow-none', className)}>
      <CardContent className="overflow-x-auto p-0">
        <table className={cn('w-full border-collapse text-left text-sm', minWidthClassName)}>{children}</table>
      </CardContent>
    </Card>
  )
}

type SortableThProps = {
  label: string
  active: boolean
  ascending: boolean
  onToggle: () => void
}

/**
 * Cabeçalho de coluna ordenável.
 */
export function SortableTh({ label, active, ascending, onToggle }: SortableThProps) {
  return (
    <th className="p-2 font-medium">
      <button type="button" className="text-left hover:underline" onClick={onToggle}>
        {label}
        {active ? (ascending ? ' ↑' : ' ↓') : ''}
      </button>
    </th>
  )
}
