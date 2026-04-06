import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Trash2, UserPlus, UsersRound } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useOrganization } from '@/contexts/OrganizationContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageContainer, SectionCard } from '@/components/library'
import OrganizationMembersDialog from '@/components/OrganizationMembersDialog'
import type { TeamMemberRow, TeamRow } from '@/api/teams'
import type { AuditLogRow } from '@/api/organizationGovernance'
import { cn } from '@/lib/utils'
import { cnAlertError } from '@/lib/supabaseDataErrors'
import {
  useAddTeamMemberMutation,
  useCreateTeamMutation,
  useDeleteTeamMutation,
  useEquipeAuditLog,
  useEquipeTeamMembers,
  useEquipeTeams,
  useRemoveTeamMemberMutation,
} from '@/hooks/useEquipe'

const EMPTY_TEAMS: TeamRow[] = []

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

function createTeamErrorMessage(error: string): string {
  if (error === 'not_owner') return 'Só o proprietário pode criar equipas.'
  return 'Não foi possível criar a equipa.'
}

function deleteTeamErrorMessage(error: string): string {
  if (error === 'not_owner') return 'Só o proprietário pode eliminar equipas.'
  return 'Não foi possível eliminar.'
}

const addMemberMessages: Record<string, string> = {
  not_owner: 'Só o proprietário pode adicionar membros à equipa.',
  invalid_email: 'E-mail inválido.',
  user_not_found: 'Utilizador não encontrado — precisa de conta no sistema.',
  not_org_member: 'A pessoa tem de pertencer primeiro à organização.',
  already_in_team: 'Já está nesta equipa.',
}

export default function EquipePage() {
  const { user } = useAuth()
  const { activeOrganizationId, organizations } = useOrganization()
  const activeOrg = organizations.find((o) => o.id === activeOrganizationId)
  const isOwner = activeOrg?.role === 'owner'

  const teamsQ = useEquipeTeams(user, activeOrganizationId)
  const teams = teamsQ.data ?? EMPTY_TEAMS
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [newTeamName, setNewTeamName] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [orgMembersDialogOpen, setOrgMembersDialogOpen] = useState(false)

  const membersQ = useEquipeTeamMembers(user, selectedTeamId)
  const members: TeamMemberRow[] = membersQ.data ?? []

  const auditQ = useEquipeAuditLog(user, activeOrganizationId, isOwner)
  const audit: AuditLogRow[] = auditQ.data ?? []

  const createTeamM = useCreateTeamMutation(user, activeOrganizationId)
  const deleteTeamM = useDeleteTeamMutation(user, activeOrganizationId)
  const addMemberM = useAddTeamMemberMutation(user, activeOrganizationId)
  const removeMemberM = useRemoveTeamMemberMutation(user, activeOrganizationId)

  useEffect(() => {
    if (!teams.length) {
      setSelectedTeamId(null)
      return
    }
    setSelectedTeamId((cur) => {
      if (cur && teams.some((t) => t.id === cur)) return cur
      return teams[0]?.id ?? null
    })
  }, [teams])

  const onCreateTeam = async () => {
    if (!newTeamName.trim()) return
    setActionError(null)
    const r = await createTeamM.mutateAsync(newTeamName)
    if (r.ok) {
      setNewTeamName('')
      setSelectedTeamId(r.team_id)
    } else {
      setActionError(createTeamErrorMessage(r.error))
    }
  }

  const onDeleteTeam = async (teamId: string) => {
    if (!window.confirm('Eliminar esta equipa? Os membros deixam de estar agrupados nesta equipa.')) return
    setActionError(null)
    const r = await deleteTeamM.mutateAsync(teamId)
    if (r.ok) {
      if (selectedTeamId === teamId) setSelectedTeamId(null)
    } else {
      setActionError(deleteTeamErrorMessage(r.error ?? 'unknown'))
    }
  }

  const onAddMember = async () => {
    if (!selectedTeamId || !addEmail.trim()) return
    setActionError(null)
    const r = await addMemberM.mutateAsync({ teamId: selectedTeamId, email: addEmail })
    if (r.ok) {
      setAddEmail('')
    } else {
      setActionError(addMemberMessages[r.error] ?? 'Não foi possível adicionar.')
    }
  }

  const onRemoveMember = async (memberUserId: string) => {
    if (!selectedTeamId) return
    if (!window.confirm('Remover este membro da equipa?')) return
    setActionError(null)
    const r = await removeMemberM.mutateAsync({ teamId: selectedTeamId, memberUserId })
    if (!r.ok) {
      setActionError(r.error === 'not_owner' ? 'Só o proprietário pode remover.' : 'Não foi possível remover.')
    }
  }

  if (!user || !activeOrganizationId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Seleccione uma organização para gerir a equipa.
      </div>
    )
  }

  const teamsLoading = teamsQ.isLoading
  const teamsError =
    teamsQ.isError && teamsQ.error instanceof Error ? teamsQ.error.message : teamsQ.isError
      ? 'Não foi possível carregar as equipas.'
      : null

  return (
    <PageContainer max="full" className="space-y-4">
      <p className="text-sm text-muted-foreground">
        <Link to="/" className="font-medium text-brand-orange underline-offset-2 hover:underline">
          Voltar ao dashboard
        </Link>
      </p>

      {actionError && (
        <div
          className={cnAlertError}
          role="alert"
        >
          {actionError}
          <button type="button" className="ml-2 underline" onClick={() => setActionError(null)}>
            Fechar
          </button>
        </div>
      )}

      <SectionCard
        title="Unidade e membros"
        description="Convites por e-mail, lista de pendentes e âmbito de dados por pessoa. As equipas (squads operacionais) estão nas secções abaixo."
        action={
          <Button type="button" variant="outline" size="sm" onClick={() => setOrgMembersDialogOpen(true)}>
            <UsersRound className="mr-1.5 h-4 w-4" />
            Gerir convites e membros
          </Button>
        }
      >
        <p className="text-sm text-muted-foreground">
          Utilize o diálogo para convidar por e-mail, copiar o link de adesão e ajustar quem vê toda a empresa ou
          apenas a própria carteira.
        </p>
      </SectionCard>

      {activeOrganizationId && (
        <OrganizationMembersDialog
          open={orgMembersDialogOpen}
          onOpenChange={setOrgMembersDialogOpen}
          organizationId={activeOrganizationId}
          organizationName={activeOrg?.name ?? 'Organização'}
          canInvite={isOwner}
        />
      )}

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
            <Button
              type="button"
              onClick={() => void onCreateTeam()}
              disabled={createTeamM.isPending || !newTeamName.trim()}
            >
              {createTeamM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar'}
            </Button>
          </div>
        )}
      </SectionCard>

      {selectedTeamId && (
        <SectionCard
          title={`Membros — ${teams.find((t) => t.id === selectedTeamId)?.name ?? 'Equipe'}`}
          description="Apenas utilizadores que já pertencem à organização podem ser adicionados."
          action={
            isOwner ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-red-700"
                onClick={() => void onDeleteTeam(selectedTeamId)}
                disabled={deleteTeamM.isPending}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Eliminar equipa
              </Button>
            ) : undefined
          }
        >
          {membersQ.isLoading ? (
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
                        disabled={removeMemberM.isPending}
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
              <Button
                type="button"
                onClick={() => void onAddMember()}
                disabled={addMemberM.isPending || !addEmail.trim()}
              >
                {addMemberM.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
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
          {auditQ.isLoading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> A carregar…
            </div>
          ) : auditQ.isError ? (
            <p className="mt-4 text-sm text-red-600" role="alert">
              Não foi possível carregar o registo de auditoria.
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
