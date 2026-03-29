import { NavLink } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { LayoutDashboard, LayoutGrid, Package, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const items: readonly {
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

/** Navegação inferior em viewports estreitos (complementa a sidebar). */
export default function MobileBottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-sidebar/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-sm md:hidden"
      aria-label="Navegação principal (mobile)"
    >
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={Boolean(end)}
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
      ))}
    </nav>
  )
}
