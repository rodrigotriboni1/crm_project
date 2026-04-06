import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { mapPostgrestOrNetworkError } from '@/lib/supabaseDataErrors'
import { activeOrganizationStorageKey } from '@/lib/storageKeys'

export type OrganizationSummary = {
  id: string
  name: string
  role: 'owner' | 'member'
  dataScope: 'organization' | 'own'
}

type OrganizationCtx = {
  organizations: OrganizationSummary[]
  activeOrganizationId: string | null
  setActiveOrganizationId: (id: string) => void
  loading: boolean
  /** Erro ao carregar `organization_members` (rede, RLS, etc.) — não confundir com «zero orgs». */
  loadError: string | null
  refreshOrganizations: () => Promise<void>
}

const Ctx = createContext<OrganizationCtx | null>(null)

type MemberRow = {
  organization_id: string
  role: string
  data_scope?: string
  organizations: { id: string; name: string } | { id: string; name: string }[] | null
}

function readStoredOrgId(userId: string): string | null {
  try {
    const v = localStorage.getItem(activeOrganizationStorageKey(userId))?.trim()
    return v || null
  } catch {
    return null
  }
}

function writeStoredOrgId(userId: string, orgId: string) {
  try {
    localStorage.setItem(activeOrganizationStorageKey(userId), orgId)
  } catch {
    /* ignore */
  }
}

function clearStoredOrgId(userId: string) {
  try {
    localStorage.removeItem(activeOrganizationStorageKey(userId))
  } catch {
    /* ignore */
  }
}

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([])
  const [activeOrganizationId, setActiveState] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!supabase || !user) {
      setOrganizations([])
      setActiveState(null)
      setLoadError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)
    const { data, error } = await supabase
      .from('organization_members')
      .select('organization_id, role, data_scope, organizations ( id, name )')
      .eq('user_id', user.id)
    if (error) {
      console.error(error)
      setLoadError(mapPostgrestOrNetworkError(error))
      setOrganizations([])
      setActiveState(null)
      if (user.id) clearStoredOrgId(user.id)
      setLoading(false)
      return
    }
    const rows = (data ?? []) as MemberRow[]
    const mapped: OrganizationSummary[] = []
    for (const r of rows) {
      const org = Array.isArray(r.organizations) ? r.organizations[0] : r.organizations
      if (!org?.id) continue
      const role = r.role === 'owner' ? 'owner' : 'member'
      const dataScope = r.data_scope === 'own' ? 'own' : 'organization'
      mapped.push({ id: org.id, name: org.name?.trim() ? org.name : 'Organização', role, dataScope })
    }
    mapped.sort((a, b) => a.name.localeCompare(b.name, 'pt'))
    setLoadError(null)
    setOrganizations(mapped)
    const stored = readStoredOrgId(user.id)
    const validStored = stored && mapped.some((m) => m.id === stored) ? stored : null
    const next = validStored ?? mapped[0]?.id ?? null
    setActiveState(next)
    if (next && user.id) writeStoredOrgId(user.id, next)
    else if (user.id) clearStoredOrgId(user.id)
    setLoading(false)
  }, [user])

  useEffect(() => {
    void load()
  }, [load])

  const setActiveOrganizationId = useCallback(
    (id: string) => {
      setActiveState(id)
      if (user?.id) writeStoredOrgId(user.id, id)
    },
    [user?.id]
  )

  const value = useMemo(
    () => ({
      organizations,
      activeOrganizationId,
      setActiveOrganizationId,
      loading,
      loadError,
      refreshOrganizations: load,
    }),
    [organizations, activeOrganizationId, setActiveOrganizationId, loading, loadError, load]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useOrganization() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useOrganization must be used within OrganizationProvider')
  return c
}
