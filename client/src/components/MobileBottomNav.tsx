import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { BarChart3, LayoutDashboard, LayoutGrid, Menu, Package, Tags, Users, Users2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

const primaryItems: readonly {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}[] = [
  { to: '/', label: 'Início', icon: LayoutDashboard, end: true },
  { to: '/kanban', label: 'Kanban', icon: LayoutGrid },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/orcamentos', label: 'Orç.', icon: Package },
]

const moreItems: readonly { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { to: '/produtos', label: 'Produtos', icon: Tags },
  { to: '/organizacao/equipe', label: 'Equipe', icon: Users2 },
]

function MobileNavLink({
  to,
  label,
  icon: Icon,
  end,
  onNavigate,
}: {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  onNavigate?: () => void
}) {
  return (
    <NavLink
      to={to}
      end={Boolean(end)}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium leading-tight',
          isActive ? 'text-brand-orange' : 'text-brand-mid'
        )
      }
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </NavLink>
  )
}

/** Navegação inferior em viewports estreitas (complementa a sidebar). */
export default function MobileBottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-sidebar/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-sm md:hidden"
      aria-label="Navegação principal (mobile)"
    >
      {primaryItems.map(({ to, label, icon, end }) => (
        <MobileNavLink key={to} to={to} label={label} icon={icon} end={end} />
      ))}

      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="flex h-auto min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-none px-1 text-[11px] font-medium leading-tight text-brand-mid hover:bg-transparent hover:text-brand-dark"
            aria-label="Mais destinos"
          >
            <Menu className="h-5 w-5 shrink-0" aria-hidden />
            <span className="truncate">Mais</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="top-auto bottom-0 left-0 max-h-[min(70dvh,28rem)] w-full max-w-none translate-x-0 translate-y-0 rounded-b-none rounded-t-xl border-b-0 sm:left-1/2 sm:top-1/2 sm:max-h-[min(90dvh,calc(100vh-2rem))] sm:w-[min(100vw-1.5rem,32rem)] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg sm:border-b">
          <DialogHeader>
            <DialogTitle className="text-left">Mais</DialogTitle>
          </DialogHeader>
          <ul className="grid gap-1 pb-2">
            {moreItems.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-brand-orange/10 text-brand-orange'
                        : 'text-brand-dark hover:bg-muted/50'
                    )
                  }
                >
                  <Icon className="h-5 w-5 shrink-0 text-brand-mid" aria-hidden />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </nav>
  )
}
