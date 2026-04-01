import { useMemo } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import {
  applyOrcamentoUpdate,
  CLIENTES_PAGE_SIZE,
  createCliente,
  createInteracao,
  createOrcamento,
  createProduto,
  fetchClientesComUltimoContatoPage,
  fetchClientesKpisSummary,
  fetchDashboard,
  fetchReportsData,
  getCliente,
  getOrcamento,
  listClientesComUltimoContato,
  INTERACOES_PAGE_SIZE,
  listInteracoesPage,
  fetchOrcamentosForKanban,
  listOrcamentosByCliente,
  listOrcamentosPage,
  listProdutos,
  ORCAMENTOS_PAGE_SIZE,
  patchOrcamento,
  updateCliente,
  updateProduto,
} from '@/api/crm'
import { supabase } from '@/lib/supabase'
import { INTERACAO_CANAIS_USUARIO } from '@/lib/interacaoCanal'
import { ORCAMENTO_STATUS_ORDER, orcamentoStatusLabel } from '@/lib/orcamentoStatusUi'
import { qk } from '@/lib/queryKeys'
import type { ClienteTipo, ClienteUpdate, OrcamentoStatus, ProdutoUpdate } from '@/types/database'
import type { OrcamentosKanbanLoad, ReportsDateRange } from '@/api/crm'

function requireClient(user: User | null, organizationId: string | null) {
  if (!supabase) throw new Error('Supabase não configurado')
  if (!user) throw new Error('Sessão necessária')
  if (!organizationId) throw new Error('Organização necessária')
  return { sb: supabase, uid: user.id, orgId: organizationId }
}

export function useDashboard(user: User | null, organizationId: string | null) {
  return useQuery({
    queryKey: user && organizationId ? qk.dashboard(user.id, organizationId) : ['dashboard', 'none'],
    queryFn: () => {
      const { sb, uid, orgId } = requireClient(user, organizationId)
      return fetchDashboard(sb, uid, orgId)
    },
    enabled: Boolean(supabase && user && organizationId),
  })
}

export function useReports(
  user: User | null,
  organizationId: string | null,
  range: ReportsDateRange | null
) {
  const key =
    user && organizationId && range
      ? qk.reports(user.id, organizationId, range.start, range.end)
      : (['reports', 'none'] as const)
  return useQuery({
    queryKey: key,
    queryFn: () => {
      const { sb, uid, orgId } = requireClient(user, organizationId)
      return fetchReportsData(sb, uid, orgId, range!)
    },
    enabled: Boolean(supabase && user && organizationId && range),
  })
}

/** Listagem paginada (cursor); usar `useClientesForPlanilha` / `useClientesForPicker` quando precisar da lista completa. */
export function useClientes(
  user: User | null,
  organizationId: string | null,
  opts?: { ativosApenas?: boolean; search?: string }
) {
  const ativosOnly = opts?.ativosApenas === true
  const search = opts?.search?.trim() ?? ''
  const infinite = useInfiniteQuery({
    queryKey:
      user && organizationId
        ? ([...qk.clientes(user.id, organizationId), 'paged', ativosOnly, search] as const)
        : (['clientes', 'none'] as const),
    queryFn: async ({ pageParam }) => {
      const { sb, uid, orgId } = requireClient(user, organizationId)
      return fetchClientesComUltimoContatoPage(sb, uid, orgId, {
        ativosApenas: ativosOnly,
        cursor: pageParam ?? null,
        limit: CLIENTES_PAGE_SIZE,
        search: search.length > 0 ? search : undefined,
      })
    },
    initialPageParam: null as { nome: string; id: string } | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(supabase && user && organizationId),
  })
  const data = useMemo(() => infinite.data?.pages.flatMap((p) => p.rows) ?? [], [infinite.data])
  return {
    data,
    isLoading: infinite.isLoading,
    isError: infinite.isError,
    error: infinite.error,
    fetchNextPage: infinite.fetchNextPage,
    hasNextPage: Boolean(infinite.hasNextPage),
    isFetchingNextPage: infinite.isFetchingNextPage,
  }
}

export function useClientesKpis(user: User | null, organizationId: string | null) {
  return useQuery({
    queryKey:
      user && organizationId
        ? (['clientes', user.id, organizationId, 'kpis'] as const)
        : (['clientes', 'kpis', 'none'] as const),
    queryFn: () => {
      const { sb, uid, orgId } = requireClient(user, organizationId)
      return fetchClientesKpisSummary(sb, uid, orgId)
    },
    enabled: Boolean(supabase && user && organizationId),
  })
}

/** Lista completa para selectores (ex.: novo orçamento). */
export function useClientesForPicker(
  user: User | null,
  organizationId: string | null,
  opts?: { ativosApenas?: boolean }
) {
  const ativosOnly = opts?.ativosApenas === true
  return useQuery({
    queryKey:
      user && organizationId
        ? qk.clientesPicker(user.id, organizationId, ativosOnly)
        : (['clientes', 'picker', 'none'] as const),
    queryFn: () => {
      const { sb, uid, orgId } = requireClient(user, organizationId)
      return listClientesComUltimoContato(sb, uid, orgId, { ativosApenas: ativosOnly })
    },
    enabled: Boolean(supabase && user && organizationId),
  })
}

/** Lista completa para a vista em planilha (Glide). */
export function useClientesForPlanilha(user: User | null, organizationId: string | null) {
  return useQuery({
    queryKey:
      user && organizationId
        ? ([...qk.clientes(user.id, organizationId), 'planilha'] as const)
        : (['clientes', 'planilha', 'none'] as const),
    queryFn: () => {
      const { sb, uid, orgId } = requireClient(user, organizationId)
      return listClientesComUltimoContato(sb, uid, orgId, {})
    },
    enabled: Boolean(supabase && user && organizationId),
  })
}

export function useCliente(user: User | null, organizationId: string | null, id: string | undefined) {
  return useQuery({
    queryKey: user && organizationId && id ? qk.cliente(user.id, organizationId, id) : ['cliente', 'none'],
    queryFn: () => {
      const { sb, uid, orgId } = requireClient(user, organizationId)
      return getCliente(sb, uid, orgId, id!)
    },
    enabled: Boolean(supabase && user && organizationId && id),
  })
}

/**
 * Orçamentos recentes para o Kanban (teto em `KANBAN_ORCAMENTOS_MAX`); evita carregar toda a org.
 */
export function useOrcamentosKanban(user: User | null, organizationId: string | null) {
  return useQuery({
    queryKey:
      user && organizationId
        ? ([...qk.orcamentos(user.id, organizationId), 'kanban'] as const)
        : (['orcamentos', 'kanban', 'none'] as const),
    queryFn: () => {
      const { sb, uid, orgId } = requireClient(user, organizationId)
      return fetchOrcamentosForKanban(sb, uid, orgId)
    },
    enabled: Boolean(supabase && user && organizationId),
  })
}

/** Orçamentos em páginas (lista / tabela). */
export function useOrcamentosInfinite(user: User | null, organizationId: string | null) {
  return useInfiniteQuery({
    queryKey:
      user && organizationId
        ? ([...qk.orcamentos(user.id, organizationId), 'infinite'] as const)
        : (['orcamentos', 'none', 'inf'] as const),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const { sb, uid, orgId } = requireClient(user, organizationId)
      return listOrcamentosPage(sb, uid, orgId, { offset: pageParam, limit: ORCAMENTOS_PAGE_SIZE })
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < ORCAMENTOS_PAGE_SIZE) return undefined
      return allPages.reduce((acc, p) => acc + p.length, 0)
    },
    enabled: Boolean(supabase && user && organizationId),
  })
}

export function useOrcamento(user: User | null, organizationId: string | null, id: string | undefined) {
  return useQuery({
    queryKey:
      user && organizationId && id ? qk.orcamento(user.id, organizationId, id) : ['orcamento', 'none'],
    queryFn: () => {
      const { sb, uid, orgId } = requireClient(user, organizationId)
      return getOrcamento(sb, uid, orgId, id!)
    },
    enabled: Boolean(supabase && user && organizationId && id),
  })
}

export function useOrcamentosByCliente(
  user: User | null,
  organizationId: string | null,
  clienteId: string | undefined
) {
  return useQuery({
    queryKey:
      user && organizationId && clienteId
        ? qk.orcamentosCliente(user.id, organizationId, clienteId)
        : ['orcamentosCliente', 'none'],
    queryFn: () => {
      const { sb, uid, orgId } = requireClient(user, organizationId)
      return listOrcamentosByCliente(sb, uid, orgId, clienteId!)
    },
    enabled: Boolean(supabase && user && organizationId && clienteId),
  })
}

export function useProdutos(
  user: User | null,
  organizationId: string | null,
  opts?: { ativosApenas?: boolean }
) {
  const ativos = opts?.ativosApenas ?? false
  return useQuery({
    queryKey:
      user && organizationId
        ? [...qk.produtos(user.id, organizationId), ativos ? 'ativos' : 'todos']
        : ['produtos', 'none'],
    queryFn: () => {
      const { sb, uid, orgId } = requireClient(user, organizationId)
      return listProdutos(sb, uid, orgId, { ativosApenas: ativos })
    },
    enabled: Boolean(supabase && user && organizationId),
  })
}

export function useInteracoes(
  user: User | null,
  organizationId: string | null,
  clienteId: string | undefined
) {
  return useInfiniteQuery({
    queryKey:
      user && organizationId && clienteId
        ? ([...qk.interacoes(user.id, organizationId, clienteId), 'paged'] as const)
        : (['interacoes', 'none'] as const),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const { sb, uid, orgId } = requireClient(user, organizationId)
      return listInteracoesPage(sb, uid, orgId, clienteId!, {
        offset: pageParam,
        limit: INTERACOES_PAGE_SIZE,
      })
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < INTERACOES_PAGE_SIZE) return undefined
      return allPages.reduce((acc, p) => acc + p.length, 0)
    },
    enabled: Boolean(supabase && user && organizationId && clienteId),
  })
}

function invalidateOrcamentoRelated(
  qc: ReturnType<typeof useQueryClient>,
  userId: string,
  organizationId: string,
  clienteId?: string
) {
  /** Inclui `kanban`, `infinite`, etc. (prefix match é o default do TanStack Query). */
  void qc.invalidateQueries({ queryKey: qk.orcamentos(userId, organizationId), exact: false })
  void qc.invalidateQueries({ queryKey: qk.dashboard(userId, organizationId) })
  void qc.invalidateQueries({ queryKey: qk.clientes(userId, organizationId) })
  if (clienteId) {
    void qc.invalidateQueries({ queryKey: qk.interacoes(userId, organizationId, clienteId) })
    void qc.invalidateQueries({ queryKey: qk.orcamentosCliente(userId, organizationId, clienteId) })
    void qc.invalidateQueries({ queryKey: qk.cliente(userId, organizationId, clienteId) })
  }
}

export function useCreateCliente(user: User | null, organizationId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (row: Parameters<typeof createCliente>[3]) => {
      const { sb, uid, orgId } = requireClient(user, organizationId)
      return createCliente(sb, uid, orgId, row)
    },
    onSuccess: () => {
      if (user && organizationId) {
        void qc.invalidateQueries({ queryKey: qk.clientes(user.id, organizationId) })
        void qc.invalidateQueries({ queryKey: qk.dashboard(user.id, organizationId) })
      }
    },
  })
}

export function useUpdateCliente(user: User | null, organizationId: string | null, id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: ClienteUpdate) => {
      const { sb, uid, orgId } = requireClient(user, organizationId)
      return updateCliente(sb, uid, orgId, id, patch)
    },
    onSuccess: () => {
      if (user && organizationId) {
        void qc.invalidateQueries({ queryKey: qk.clientes(user.id, organizationId) })
        void qc.invalidateQueries({ queryKey: qk.cliente(user.id, organizationId, id) })
      }
    },
  })
}

const BULK_CLIENTE_CONCURRENCY = 6

/** Vários `updateCliente` em paralelo (com limite) — edição em massa na planilha. */
export function useBulkPatchClientes(user: User | null, organizationId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (items: { id: string; patch: ClienteUpdate }[]) => {
      const { sb, uid, orgId } = requireClient(user, organizationId)
      for (let i = 0; i < items.length; i += BULK_CLIENTE_CONCURRENCY) {
        const chunk = items.slice(i, i + BULK_CLIENTE_CONCURRENCY)
        await Promise.all(chunk.map(({ id, patch }) => updateCliente(sb, uid, orgId, id, patch)))
      }
    },
    onSuccess: (_data, items) => {
      if (!user || !organizationId) return
      void qc.invalidateQueries({ queryKey: qk.clientes(user.id, organizationId) })
      void qc.invalidateQueries({ queryKey: qk.dashboard(user.id, organizationId) })
      const ids = new Set(items.map((x) => x.id))
      for (const id of ids) {
        void qc.invalidateQueries({ queryKey: qk.cliente(user.id, organizationId, id) })
      }
    },
  })
}

export function useCreateOrcamento(user: User | null, organizationId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (row: Parameters<typeof createOrcamento>[3]) => {
      const { sb, uid, orgId } = requireClient(user, organizationId)
      return createOrcamento(sb, uid, orgId, row)
    },
    onSuccess: (_d, vars) => {
      if (user && organizationId) {
        invalidateOrcamentoRelated(qc, user.id, organizationId, vars.cliente_id)
      }
    },
  })
}

export function useCreateProduto(user: User | null, organizationId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (row: Parameters<typeof createProduto>[3]) => {
      const { sb, uid, orgId } = requireClient(user, organizationId)
      return createProduto(sb, uid, orgId, row)
    },
    onSuccess: () => {
      if (user && organizationId) {
        void qc.invalidateQueries({ queryKey: qk.produtos(user.id, organizationId) })
      }
    },
  })
}

export function useUpdateProduto(user: User | null, organizationId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; patch: ProdutoUpdate }) => {
      const { sb, uid, orgId } = requireClient(user, organizationId)
      return updateProduto(sb, uid, orgId, args.id, args.patch)
    },
    onSuccess: () => {
      if (user && organizationId) {
        void qc.invalidateQueries({ queryKey: qk.produtos(user.id, organizationId) })
        void qc.invalidateQueries({ queryKey: qk.orcamentos(user.id, organizationId), exact: false })
        void qc.invalidateQueries({ queryKey: qk.dashboard(user.id, organizationId) })
      }
    },
  })
}

export function useApplyOrcamentoUpdate(user: User | null, organizationId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: {
      orcamentoId: string
      clienteId: string
      status: OrcamentoStatus
      followUpAt: string | null
      note?: string | null
      lostReason?: string | null
    }) => {
      const { sb } = requireClient(user, organizationId)
      return applyOrcamentoUpdate(sb, {
        orcamentoId: args.orcamentoId,
        status: args.status,
        followUpAt: args.followUpAt,
        note: args.note,
        lostReason: args.lostReason,
      })
    },
    onMutate: async (args) => {
      if (!user || !organizationId) return undefined
      const key = [...qk.orcamentos(user.id, organizationId), 'kanban'] as const
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<OrcamentosKanbanLoad>(key)
      if (!previous) return undefined
      qc.setQueryData<OrcamentosKanbanLoad>(key, {
        ...previous,
        rows: previous.rows.map((r) =>
          r.id === args.orcamentoId
            ? {
                ...r,
                status: args.status,
                follow_up_at: args.followUpAt,
                lost_reason:
                  args.status === 'perdido' && args.lostReason !== undefined
                    ? args.lostReason
                    : r.lost_reason,
              }
            : r
        ),
      })
      return { previous, key } as const
    },
    onError: (_err, _args, context) => {
      if (context?.previous) {
        qc.setQueryData(context.key, context.previous)
      }
    },
    onSuccess: (_d, args) => {
      if (user && organizationId) {
        invalidateOrcamentoRelated(qc, user.id, organizationId, args.clienteId)
        void qc.invalidateQueries({ queryKey: qk.orcamento(user.id, organizationId, args.orcamentoId) })
      }
    },
  })
}

export function usePatchOrcamento(user: User | null, organizationId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: {
      id: string
      clienteId: string
      patch: { tax_id?: string | null; produto_id?: string | null; produto_descricao?: string }
    }) => {
      const { sb, uid, orgId } = requireClient(user, organizationId)
      return patchOrcamento(sb, uid, orgId, args.id, args.patch)
    },
    onSuccess: (_d, args) => {
      if (user && organizationId) {
        void qc.invalidateQueries({ queryKey: qk.orcamento(user.id, organizationId, args.id) })
        invalidateOrcamentoRelated(qc, user.id, organizationId, args.clienteId)
      }
    },
  })
}

export function useCreateInteracao(user: User | null, organizationId: string | null, clienteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (row: Omit<Parameters<typeof createInteracao>[3], 'cliente_id'>) => {
      const { sb, uid, orgId } = requireClient(user, organizationId)
      return createInteracao(sb, uid, orgId, { ...row, cliente_id: clienteId })
    },
    onSuccess: () => {
      if (user && organizationId) {
        void qc.invalidateQueries({ queryKey: qk.interacoes(user.id, organizationId, clienteId) })
        void qc.invalidateQueries({ queryKey: qk.dashboard(user.id, organizationId) })
        void qc.invalidateQueries({ queryKey: qk.clientes(user.id, organizationId) })
      }
    },
  })
}

export function clienteTipoLabel(t: ClienteTipo): string {
  return t === 'recompra' ? 'Recompra' : 'Novo'
}

export { ORCAMENTO_STATUS_ORDER, orcamentoStatusLabel }

/** Re-export alinhado a `interacoes.canal` (CHECK no Postgres). */
export const CANAIS_CONTATO = INTERACAO_CANAIS_USUARIO
