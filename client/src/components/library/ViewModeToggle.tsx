import * as React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type ViewModeOption<T extends string> = {
  value: T
  icon: React.ReactNode
  /** aria-label */
  label: string
}

type Props<T extends string> = {
  value: T
  onChange: (value: T) => void
  modes: ViewModeOption<T>[]
  className?: string
}

/**
 * Botões segmentados para alternar vista (ex.: lista / tabela).
 */
export function ViewModeToggle<T extends string>({ value, onChange, modes, className }: Props<T>) {
  return (
    <div className={cn('flex items-center gap-1 rounded-md border border-border p-0.5', className)}>
      {modes.map((m) => (
        <Button
          key={m.value}
          type="button"
          variant={value === m.value ? 'secondary' : 'ghost'}
          size="sm"
          className="h-8 px-2"
          aria-label={m.label}
          onClick={() => onChange(m.value)}
        >
          {m.icon}
        </Button>
      ))}
    </div>
  )
}
