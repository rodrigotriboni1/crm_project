import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Trash2, UserPlus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useOrganization } from '@/contexts/OrganizationContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageContainer, SectionCard } from '@/components/library'
import {
  addTeamMemberByEmail,
  createTeam,
  deleteTeam,
  listTeamMembers,
  listTeams,
  removeTeamMember,
  type TeamMemberRow,
  type TeamRow,
} from '@/api/teams'
import { listOrganizationAuditLog, type AuditLogRow } from '@/api/organizationGovernance'
import { cn } from '@/lib/utils'

function auditActionLabel(action: string): string {
  switch (action) {
    case 'member_added':
      return 'Membro adicionado'
    case 'member_updated':
      return 'Membro atualizado'
    case 'member_removed':
      return 'Membro removido'
    case 'team_member_added':
      return 'Adicionado a equipa'
    case 'team_member_removed':
      return 'Removido da equipa'
    default:
      return action
  }
}

export default function EquipePage() {
  const { user } = useAuth()
  const { activeOrganizationId, organizations } = useOrganization()
  const activeOrg = organizations.find((o) => o.id === activeOrganizationId)
  const isOwner = activeOrg?.role === 'owner'

  const [teams, setTeams] = useState<TeamRow[]>([])
  const [teamsLoading, setTeamsLoading] = useState(true)
  const [teamsError, setTeamsError] = useState<string | null>(null)

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [members, setMembers] = useState<TeamMemberRow[]>([])
  const [membersLoading, setMembersLoading] = useState(false)

  const [newTeamName, setNewTeamName] = useState('')
  const [createBusy, setCreateBusy] = useState(false)

  const [addEmail, setAddEmail] = useState('')
  const [addBusy, setAddBusy] = useState(false)

  const [audit, setAudit] = useState<AuditLogRow[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditError, setAuditError] = useState<string | null>(null)

  const loadTeams = useCallback(async () => {
    if (!supabase || !activeOrganizationId) {
      setTeams([])
      setTeamsLoading(false)
      return
    }
    setTeamsLoading(true)
    setTeamsError(null)
    try {
      const rows = await listTeams(supabase, activeOrganizationId)
      setTeams(rows)
      setSelectedTeamId((cur) => {
        if (cur && rows.some((t) => t.id === cur)) return cur
        return rows[0]?.id ?? null
      })
    } catch {
      setTeamsError('Não foi possível carregar as equipas.')
      setTeams([])
    } finally {
      setTeamsLoading(false)
    }
  }, [activeOrganizationId])

  const loadMembers = useCallback(async (teamId: string | null) => {
    if (!supabase || !teamId) {
      setMembers([])
      return
    }
    setMembersLoading(true)
    try {
      const rows = await listTeamMembers(supabase, teamId)
      setMembers(rows)
    } catch {
      setMembers([])
    } finally {
      setMembersLoading(false)
    }
  }, [])

  const loadAudit = useCallback(async () => {
    if (!supabase || !activeOrganizationId || !isOwner) {
      setAudit([])
      return
    }
    setAuditLoading(true)
    setAuditError(null)
    try {
      const rows = await listOrganizationAuditLog(supabase, activeOrganizationId, 100)
      setAudit(rows)
    } catch {
      setAuditError('Não foi possível carregar o registo de auditoria.')
      setAudit([])
    } finally {
      setAuditLoading(false)
    }
  }, [activeOrganizationId, isOwner])

  useEffect(() => {
    void loadTeams()
  }, [loadTeams])

  useEffect(() => {
    void loadMembers(selectedTeamId)
  }, [selectedTeamId, loadMembers])

  useEffect(() => {
    void loadAudit()
  }, [loadAudit])

  const onCreateTeam = async () => {
    if (!supabase || !activeOrganizationId || !newTeamName.trim()) return
    setCreateBusy(true)
    const r = await createTeam(supabase, activeOrganizationId, newTeamName)
    setCreateBusy(false)
    if (r.ok) {
      setNewTeamName('')
      await loadTeams()
      setSelectedTeamId(r.team_id)
    } else {
      window.alert(
        r.error === 'not_owner' ? 'Só o proprietário pode criar equipas.' : 'Não foi possível criar a equipa.'
      )
    }
  }

  const onDeleteTeam = async (teamId: string) => {
    if (!supabase) return
    if (!window.confirm('Eliminar esta equipa? Os membros deixam de estar agrupados nesta equipa.')) return
    const r = await deleteTeam(supabase, teamId)
    if (r.ok) {
      await loadTeams()
      if (selectedTeamId === teamId) setSelectedTeamId(null)
    } else {
      window.alert(
        r.error === 'not_owner' ? 'Só o proprietário pode eliminar equipas.' : 'Não foi possível eliminar.'
      )
    }
  }

  const onAddMember = async () => {
    if (!supabase || !selectedTeamId || !addEmail.trim()) return
    setAddBusy(true)
    const r = await addTeamMemberByEmail(supabase, selectedTeamId, addEmail)
    setAddBusy(false)
    if (r.ok) {
      setAddEmail('')
      await loadMembers(selectedTeamId)
      await loadAudit()
    } else {
      const map: Record<string, string> = {
        not_owner: 'Só o proprietário pode adicionar membros à equipa.',
        invalid_email: 'E-mail inválido.',
        user_not_found: 'Utilizador não encontrado — precisa de conta no sistema.',
        not_org_member: 'A pessoa tem de pertencer primeiro à organização.',
        already_in_team: 'Já está nesta equipa.',
      }
      window.alert(map[r.error] ?? 'Não foi possível adicionar.')
    }
  }

  const onRemoveMember = async (memberUserId: string) => {
    if (!supabase || !selectedTeamId) return
    if (!window.confirm('Remover este membro da equipa?')) return
    const r = await removeTeamMember(supabase, selectedTeamId, memberUserId)
    if (r.ok) {
      await loadMembers(selectedTeamId)
      await loadAudit()
    } else {
      window.alert(r.error === 'not_owner' ? 'Só o proprietário pode remover.' : 'Não foi possível remover.')
    }
  }

  if (!user || !activeOrganizationId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Seleccione uma organização para gerir a equipa.
      </div>
    )
  }

  return (
    <PageContainer max="lg" className="space-y-4">
      <p className="text-sm text-muted-foreground">
        <Link to="/" className="font-medium text-brand-orange underline-offset-2 hover:underline">
          Voltar ao dashboard
        </Link>
      </p>

      <SectionCard
        title="Equipas"
        description="Equipas agrupam membros para organização interna. A visibilidade de clientes e orçamentos define-se pelo âmbito de dados de cada membro (diálogo Equipe na barra lateral)."
      >
        {teamsLoading ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> A carregar…
          </div>
        ) : teamsError ? (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {teamsError}
          </p>
        ) : teams.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Ainda não existem equipas nesta organização.</p>
        ) : (
          <ul className="mt-4 flex flex-wrap gap-2">
            {teams.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setSelectedTeamId(t.id)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                    selectedTeamId === t.id
                      ? 'border-brand-orange bg-brand-orange/10 font-medium text-brand-orange'
                      : 'border-border bg-background text-brand-dark hover:bg-muted/40'
                  )}
                >
                  <span className="block truncate">{t.name}</span>
                  <span className="text-[11px] text-muted-foreground">{t.member_count} membro(s)</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {isOwner && (
          <div className="mt-6 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="new-team-name">Nova equipa</Label>
              <Input
                id="new-team-name"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Nome da equipa"
                maxLength={120}
              />
            </div>
            <Button type="button" onClick={() => void onCreateTeam()} disabled={createBusy || !newTeamName.trim()}>
              {createBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar'}
            </Button>
          </div>
        )}
      </SectionCard>

      {selectedTeamId && (
        <SectionCard
          title={`Membros — ${teams.find((t) => t.id === selectedTeamId)?.name ?? 'Equipa'}`}
          description="Apenas utilizadores que já pertencem à organização podem ser adicionados."
          action={
            isOwner ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-red-700"
                onClick={() => void onDeleteTeam(selectedTeamId)}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Eliminar equipa
              </Button>
            ) : undefined
          }
        >
          {membersLoading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> A carregar membros…
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
              {members.length === 0 ? (
                <li className="px-3 py-4 text-sm text-muted-foreground">Nenhum membro nesta equipa.</li>
              ) : (
                members.map((m) => (
                  <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-brand-dark">
                        {m.full_name?.trim() || m.email || m.user_id.slice(0, 8) + '…'}
                      </p>
                      {m.email && <p className="truncate text-xs text-muted-foreground">{m.email}</p>}
                    </div>
                    {isOwner && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-red-700"
                        onClick={() => void onRemoveMember(m.user_id)}
                      >
                        Remover
                      </Button>
                    )}
                  </li>
                ))
              )}
            </ul>
          )}

          {isOwner && (
            <div className="mt-6 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor="add-member-email">Adicionar por e-mail</Label>
                <Input
                  id="add-member-email"
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="email@empresa.com"
                  autoComplete="off"
                />
              </div>
              <Button type="button" onClick={() => void onAddMember()} disabled={addBusy || !addEmail.trim()}>
                {addBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                <span className="ml-2">Adicionar</span>
              </Button>
            </div>
          )}
        </SectionCard>
      )}

      {isOwner && (
        <SectionCard
          title="Auditoria"
          description="Alterações a membros e equipas (visível apenas para o proprietário)."
        >
          {auditLoading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> A carregar…
            </div>
          ) : auditError ? (
            <p className="mt-4 text-sm text-red-600" role="alert">
              {auditError}
            </p>
          ) : audit.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem eventos registados.</p>
          ) : (
            <ul className="relative mt-2 space-y-4 border-l border-border pl-4">
              {audit.map((row) => (
                <li key={row.id} className="relative">
                  <span
                    className="absolute -left-[calc(1rem+5px)] top-1.5 h-2.5 w-2.5 rounded-full border border-border bg-card ring-2 ring-card"
                    aria-hidden
                  />
                  <time className="block text-xs text-muted-foreground">
                    {row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
                  </time>
                  <p className="text-sm font-medium text-brand-dark">{auditActionLabel(row.action)}</p>
                  <p className="text-xs text-muted-foreground">{row.actor_email ?? '—'}</p>
                  {row.detail != null && (
                    <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                      {JSON.stringify(row.detail)}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      )}
    </PageContainer>
  )
}

