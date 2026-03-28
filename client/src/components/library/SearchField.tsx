import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  inputClassName?: string
  id?: string
}

/**
 * Campo de busca com ícone à esquerda (padrão das páginas de lista).
 */
export function SearchField({ value, onChange, placeholder, className, inputClassName, id }: Props) {
  return (
    <div className={cn('relative w-full', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        className={cn('h-9 pl-9 text-sm', inputClassName)}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
