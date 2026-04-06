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
  /** Nome da unidade operacional (matriz de dados no CRM). */
  name: string
  role: 'owner' | 'member'
  dataScope: 'organization' | 'own'
  legalEntityId: string
  /** Entidade legal (CNPJ/CPF); pode coincidir com o nome da unidade na provisão inicial. */
  legalEntityName: string
  taxIdType: 'cnpj' | 'cpf' | null
  taxId: string | null
}

/** Agrupa unidades por entidade legal para o selector (optgroup). */
export type OrganizationSelectGroup = {
  legalEntityId: string
  legalEntityLabel: string
  units: OrganizationSummary[]
}

export function groupOrganizationsForSelect(orgs: OrganizationSummary[]): OrganizationSelectGroup[] {
  const byLe = new Map<string, OrganizationSummary[]>()
  for (const o of orgs) {
    const arr = byLe.get(o.legalEntityId) ?? []
    arr.push(o)
    byLe.set(o.legalEntityId, arr)
  }
  const groups: OrganizationSelectGroup[] = []
  for (const [legalEntityId, units] of byLe) {
    const sorted = [...units].sort((a, b) => a.name.localeCompare(b.name, 'pt'))
    const legalEntityLabel = sorted[0]?.legalEntityName?.trim() || 'Conta'
    groups.push({ legalEntityId, legalEntityLabel, units: sorted })
  }
  groups.sort((a, b) => a.legalEntityLabel.localeCompare(b.legalEntityLabel, 'pt'))
  return groups
}

/** Uma única opção simples, sem optgroup. */
export function organizationSelectIsFlat(orgs: OrganizationSummary[]): boolean {
  return orgs.length <= 1
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

type LegalEntityRow = {
  id: string
  name: string | null
  tax_id_type: string | null
  tax_id: string | null
}

type OrgRowEmbed = {
  id: string
  name: string | null
  legal_entity_id: string | null
  legal_entities: LegalEntityRow | LegalEntityRow[] | null
}

type MemberRow = {
  organization_id: string
  role: string
  data_scope?: string
  organizations: OrgRowEmbed | OrgRowEmbed[] | null
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
      .select(
        'organization_id, role, data_scope, organizations ( id, name, legal_entity_id, legal_entities ( id, name, tax_id_type, tax_id ) )'
      )
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
      const leRaw = org.legal_entities
      const le = Array.isArray(leRaw) ? leRaw[0] : leRaw
      const legalEntityId = le?.id ?? org.legal_entity_id
      if (!legalEntityId) continue
      const legalEntityName =
        le?.name?.trim() || org.name?.trim() || 'Entidade'
      const tt = le?.tax_id_type
      const taxIdType = tt === 'cnpj' || tt === 'cpf' ? tt : null
      const taxId = le?.tax_id?.trim() ? le.tax_id.trim() : null
      const role = r.role === 'owner' ? 'owner' : 'member'
      const dataScope = r.data_scope === 'own' ? 'own' : 'organization'
      const unitName = org.name?.trim() ? org.name : 'Unidade'
      mapped.push({
        id: org.id,
        name: unitName,
        role,
        dataScope,
        legalEntityId,
        legalEntityName,
        taxIdType,
        taxId,
      })
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
