import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
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
import { supabase } from '@/lib/supabase'

const q = {
  teams: (uid: string, orgId: string) => ['equipe', 'teams', uid, orgId] as const,
  members: (uid: string, teamId: string) => ['equipe', 'members', uid, teamId] as const,
  audit: (uid: string, orgId: string) => ['equipe', 'audit', uid, orgId] as const,
}

function requireSb() {
  if (!supabase) throw new Error('Supabase não configurado')
  return supabase
}

export function useEquipeTeams(user: User | null, organizationId: string | null) {
  return useQuery({
    queryKey: user && organizationId ? q.teams(user.id, organizationId) : ['equipe', 'teams', 'none'],
    queryFn: async (): Promise<TeamRow[]> => {
      const sb = requireSb()
      if (!organizationId) return []
      return listTeams(sb, organizationId)
    },
    enabled: Boolean(supabase && user && organizationId),
  })
}

export function useEquipeTeamMembers(user: User | null, teamId: string | null) {
  return useQuery({
    queryKey: user && teamId ? q.members(user.id, teamId) : ['equipe', 'members', 'none'],
    queryFn: async (): Promise<TeamMemberRow[]> => {
      const sb = requireSb()
      if (!teamId) return []
      return listTeamMembers(sb, teamId)
    },
    enabled: Boolean(supabase && user && teamId),
  })
}

export function useEquipeAuditLog(
  user: User | null,
  organizationId: string | null,
  isOwner: boolean,
  limit = 100
) {
  return useQuery({
    queryKey: user && organizationId && isOwner ? q.audit(user.id, organizationId) : ['equipe', 'audit', 'none'],
    queryFn: async (): Promise<AuditLogRow[]> => {
      const sb = requireSb()
      if (!organizationId) return []
      return listOrganizationAuditLog(sb, organizationId, limit)
    },
    enabled: Boolean(supabase && user && organizationId && isOwner),
  })
}

export function useCreateTeamMutation(user: User | null, organizationId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const sb = requireSb()
      if (!organizationId) throw new Error('Organização necessária')
      return createTeam(sb, organizationId, name)
    },
    onSuccess: () => {
      if (user && organizationId) {
        void qc.invalidateQueries({ queryKey: q.teams(user.id, organizationId) })
      }
    },
  })
}

export function useDeleteTeamMutation(user: User | null, organizationId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (teamId: string) => {
      const sb = requireSb()
      return deleteTeam(sb, teamId)
    },
    onSuccess: (_d, teamId) => {
      if (!user) return
      if (organizationId) {
        void qc.invalidateQueries({ queryKey: q.teams(user.id, organizationId) })
      }
      void qc.removeQueries({ queryKey: q.members(user.id, teamId) })
    },
  })
}

export function useAddTeamMemberMutation(user: User | null, organizationId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ teamId, email }: { teamId: string; email: string }) => {
      const sb = requireSb()
      return addTeamMemberByEmail(sb, teamId, email)
    },
    onSuccess: (_d, { teamId }) => {
      if (!user) return
      void qc.invalidateQueries({ queryKey: q.members(user.id, teamId) })
      if (organizationId) {
        void qc.invalidateQueries({ queryKey: q.audit(user.id, organizationId) })
      }
    },
  })
}

export function useRemoveTeamMemberMutation(user: User | null, organizationId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ teamId, memberUserId }: { teamId: string; memberUserId: string }) => {
      const sb = requireSb()
      return removeTeamMember(sb, teamId, memberUserId)
    },
    onSuccess: (_d, { teamId }) => {
      if (!user) return
      void qc.invalidateQueries({ queryKey: q.members(user.id, teamId) })
      if (organizationId) {
        void qc.invalidateQueries({ queryKey: q.audit(user.id, organizationId) })
      }
    },
  })
}
