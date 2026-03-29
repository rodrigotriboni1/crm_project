import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useThemeMode } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'

type Props = {
  collapsed?: boolean
  /** Se true, não ocupa largura total (ex.: canto do login). */
  inline?: boolean
  className?: string
}

export default function ThemeToggle({ collapsed, inline, className }: Props) {
  const { mode, toggle } = useThemeMode()
  const isDark = mode === 'dark'

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        !inline && 'w-full',
        'font-sans text-brand-mid hover:bg-brand-surface/50 hover:text-brand-dark',
        inline && 'w-auto justify-start gap-2',
        !inline && collapsed && 'justify-center px-0',
        !inline && !collapsed && 'justify-start gap-2',
        className
      )}
      onClick={() => toggle()}
      title={isDark ? 'Modo claro' : 'Modo escuro'}
      aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      aria-pressed={isDark}
    >
      {isDark ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
      {!(collapsed === true && !inline) && (
        <span>{isDark ? 'Modo claro' : 'Modo escuro'}</span>
      )}
    </Button>
  )
}
