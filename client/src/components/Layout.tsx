import { useCallback, useState, type ReactNode } from 'react'
import { cnAlertError } from '@/lib/supabaseDataErrors'
import { Link, NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  LayoutGrid,
  BarChart3,
  Package,
  Users,
  LogOut,
  Box,
  Plus,
  Tags,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  UserPlus,
  Users2,
  Link2,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  groupOrganizationsForSelect,
  organizationSelectIsFlat,
  useOrganization,
} from '@/contexts/OrganizationContext'
import { Button } from '@/components/ui/button'
import NovoOrcamentoDialog from '@/components/NovoOrcamentoDialog'
import OrganizationMembersDialog from '@/components/OrganizationMembersDialog'
import {
  LEGACY_SIDEBAR_COLLAPSED_KEY,
  SIDEBAR_COLLAPSED_KEY,
} from '@/lib/storageKeys'
import { AssistantDockProvider } from '@/contexts/AssistantDockContext'
import { ClienteImportJobProvider } from '@/contexts/ClienteImportJobContext'
import LayoutAssistantRail from '@/components/LayoutAssistantRail'
import MobileBottomNav from '@/components/MobileBottomNav'
import ImportProgressBanner from '@/components/cliente/ImportProgressBanner'
import ThemeToggle from '@/components/ThemeToggle'
import { SelectNative } from '@/components/ui/select-native'
import { cn } from '@/lib/utils'

function readSidebarCollapsed(): boolean {
  try {
    const cur = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    if (cur !== null) return cur === '1'
    return localStorage.getItem(LEGACY_SIDEBAR_COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/kanban', label: 'Kanban', icon: LayoutGrid },
  { to: '/orcamentos', label: 'Orçamentos', icon: Package },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { to: '/produtos', label: 'Produtos', icon: Tags },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/organizacao/equipe', label: 'Equipe', icon: Users2 },
]

const externalNovoOrcamentoUrl =
  typeof import.meta.env.VITE_NOVO_ORCAMENTO_EXTERNAL_URL === 'string'
    ? import.meta.env.VITE_NOVO_ORCAMENTO_EXTERNAL_URL.trim()
    : ''

function OrganizationMain({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const {
    loading,
    organizations,
    activeOrganizationId,
    loadError,
    refreshOrganizations,
  } = useOrganization()

  if (!user) return <>{children}</>

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-brand-mid">
        A carregar organizações…
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <p className={cn('max-w-md text-center text-sm', cnAlertError)} role="alert">
          {loadError}
        </p>
        <p className="max-w-md text-center text-xs text-muted-foreground">
          Se o problema continuar, confirme a ligação e que as migrações Supabase estão aplicadas no projecto.
        </p>
        <Button type="button" onClick={() => void refreshOrganizations()}>
          Tentar de novo
        </Button>
      </div>
    )
  }

  if (organizations.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <p className="max-w-sm text-center text-sm text-brand-mid">
          A sua conta ainda não tem acesso a nenhuma unidade do CRM. Peça um convite ao administrador ou utilize o
          link de convite que recebeu por e-mail.
        </p>
        <Button type="button" variant="outline" asChild>
          <Link to="/join" className="inline-flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Tenho um código de convite
          </Link>
        </Button>
      </div>
    )
  }

  if (!activeOrganizationId) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-brand-mid">
        A seleccionar unidade…
      </div>
    )
  }

  return <>{children}</>
}

export default function Layout() {
  const { user, signOut } = useAuth()
  const { organizations, activeOrganizationId, setActiveOrganizationId } = useOrganization()
  const [novoOrcamentoOpen, setNovoOrcamentoOpen] = useState(false)
  const [teamDialogOpen, setTeamDialogOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed)

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0')
        localStorage.removeItem(LEGACY_SIDEBAR_COLLAPSED_KEY)
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const collapsed = sidebarCollapsed

  const activeOrg = organizations.find((o) => o.id === activeOrganizationId)
  const activeOrgOwner = activeOrg?.role === 'owner'
  const selectGroups = groupOrganizationsForSelect(organizations)
  const flatSelect = organizationSelectIsFlat(organizations)
  const activeSelectTitle = activeOrg
    ? activeOrg.legalEntityName === activeOrg.name
      ? activeOrg.name
      : `${activeOrg.legalEntityName} — ${activeOrg.name}`
    : 'Unidade ativa'

  return (
    <div className="flex h-screen overflow-hidden bg-brand-light">
      <aside
        id="app-sidebar"
        className={cn(
          'flex min-h-0 shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-200 ease-out',
          'max-md:pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] md:pb-0',
          collapsed ? 'w-16' : 'w-52'
        )}
      >
        {/* Linha 1: marca + recolher (nunca misturar com o select na horizontal) */}
        <div
          className={cn(
            'flex shrink-0 items-center border-b border-border',
            collapsed ? 'flex-col gap-2 px-2 py-3' : 'justify-between gap-2 px-3 py-3'
          )}
        >
          <div
            className={cn(
              'flex min-w-0 items-center gap-2.5 overflow-hidden',
              collapsed ? 'flex-col' : 'flex-1'
            )}
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-orange">
              <Box className="h-4 w-4 text-white" />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="truncate font-sans text-sm font-semibold leading-tight text-brand-dark">
                  EmbalaFlow
                </p>
                <p className="font-sans text-[11px] text-brand-mid">CRM</p>
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 shrink-0 p-0 text-brand-mid hover:text-brand-dark"
            onClick={toggleSidebar}
            aria-expanded={!collapsed}
            aria-controls="app-sidebar"
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
            <span className="sr-only">{collapsed ? 'Expandir menu' : 'Recolher menu'}</span>
          </Button>
        </div>

        {/* Linha 2: unidade (dados CRM) por entidade legal */}
        {user && organizations.length > 0 && activeOrganizationId && (
          <div className={cn('shrink-0 border-b border-border', collapsed ? 'px-2 py-2' : 'px-3 py-2')}>
            <label className="sr-only" htmlFor="active-org-select">
              Unidade ativa
            </label>
            <SelectNative
              id="active-org-select"
              className={cn(
                'h-9 w-full min-w-0 text-xs',
                collapsed && 'h-8 px-1.5 text-[10px]'
              )}
              value={activeOrganizationId}
              onChange={(e) => setActiveOrganizationId(e.target.value)}
              title={activeSelectTitle}
              aria-label="Unidade ativa do CRM"
            >
              {flatSelect
                ? organizations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))
                : selectGroups.map((g) => (
                    <optgroup key={g.legalEntityId} label={g.legalEntityLabel}>
                      {g.units.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
            </SelectNative>
          </div>
        )}

        <nav
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-2"
          aria-label="Navegação principal"
        >
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={label}
              className={({ isActive }) =>
                cn(
                  'flex w-full items-center border-l-2 font-sans text-sm transition-colors',
                  collapsed ? 'justify-center px-2 py-2.5' : 'gap-2.5 px-4 py-2.5',
                  isActive
                    ? 'border-brand-orange bg-brand-orange/10 font-medium text-brand-orange'
                    : 'border-transparent text-brand-mid hover:bg-brand-surface/50 hover:text-brand-dark'
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className={cn('shrink-0 border-t border-border py-2', collapsed ? 'px-1.5' : 'px-2')}>
          <Button
            type="button"
            size="sm"
            className={cn(
              'w-full gap-2 font-sans',
              collapsed ? 'justify-center px-0' : 'justify-start'
            )}
            onClick={() => setNovoOrcamentoOpen(true)}
            title="Novo orçamento (no CRM)"
          >
            <Plus className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Novo orçamento</span>}
          </Button>
          {externalNovoOrcamentoUrl && (
            <a
              href={externalNovoOrcamentoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'mt-1 flex w-full items-center gap-2 rounded-md border border-transparent bg-transparent px-3 py-2 font-sans text-sm text-brand-mid transition-colors hover:bg-brand-surface/50 hover:text-brand-dark',
                collapsed && 'justify-center px-0 py-2'
              )}
              title="Novo orçamento (abre página externa)"
            >
              <ExternalLink className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">Novo orçamento (web)</span>}
            </a>
          )}
        </div>

        <div className={cn('shrink-0 space-y-1 border-t border-border p-2', collapsed && 'px-1.5')}>
          <ThemeToggle collapsed={collapsed} />
          {user && organizations.length > 0 && activeOrganizationId && activeOrg && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                'w-full font-sans text-brand-mid hover:bg-brand-surface/50 hover:text-brand-dark',
                collapsed ? 'justify-center px-0' : 'justify-start gap-2'
              )}
              onClick={() => setTeamDialogOpen(true)}
              title="Membros da unidade"
            >
              {activeOrgOwner ? (
                <UserPlus className="h-4 w-4 shrink-0" />
              ) : (
                <Users className="h-4 w-4 shrink-0" />
              )}
              {!collapsed && <span className="truncate">Equipe</span>}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'w-full font-sans text-brand-mid hover:bg-brand-surface/50 hover:text-brand-dark',
              collapsed ? 'justify-center px-0' : 'justify-start gap-2'
            )}
            onClick={() => void signOut()}
            title="Sair"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sair</span>}
          </Button>
        </div>
      </aside>

      <NovoOrcamentoDialog
        user={user}
        open={novoOrcamentoOpen}
        onOpenChange={setNovoOrcamentoOpen}
      />

      {activeOrganizationId && activeOrg && (
        <OrganizationMembersDialog
          open={teamDialogOpen}
          onOpenChange={setTeamDialogOpen}
          organizationId={activeOrganizationId}
          organizationName={activeOrg.name}
          canInvite={activeOrgOwner}
        />
      )}

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <AssistantDockProvider>
          <ClienteImportJobProvider>
            <OrganizationMain>
              <div className="flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden">
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden max-md:pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] md:pb-0">
                  <Outlet />
                </div>
                <LayoutAssistantRail />
              </div>
              <ImportProgressBanner />
            </OrganizationMain>
          </ClienteImportJobProvider>
        </AssistantDockProvider>
      </main>

      <MobileBottomNav />
    </div>
  )
}
