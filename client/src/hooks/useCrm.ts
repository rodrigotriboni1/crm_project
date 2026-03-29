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
  listOrcamentos,
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
import type { ReportsDateRange } from '@/api/crm'

function requireClient(user: User | null) {
  if (!supabase) throw new Error('Supabase não configurado')
  if (!user) throw new Error('Sessão necessária')
  return { sb: supabase, uid: user.id }
}

export function useDashboard(user: User | null) {
  return useQuery({
    queryKey: user ? qk.dashboard(user.id) : ['dashboard', 'none'],
    queryFn: () => {
      const { sb, uid } = requireClient(user)
      return fetchDashboard(sb, uid)
    },
    enabled: Boolean(supabase && user),
  })
}

export function useReports(user: User | null, range: ReportsDateRange | null) {
  const key =
    user && range ? qk.reports(user.id, range.start, range.end) : (['reports', 'none'] as const)
  return useQuery({
    queryKey: key,
    queryFn: () => {
      const { sb, uid } = requireClient(user)
      return fetchReportsData(sb, uid, range!)
    },
    enabled: Boolean(supabase && user && range),
  })
}

/** Listagem paginada (cursor); usar `useClientesForPlanilha` / `useClientesForPicker` quando precisar da lista completa. */
export function useClientes(user: User | null, opts?: { ativosApenas?: boolean }) {
  const ativosOnly = opts?.ativosApenas === true
  const infinite = useInfiniteQuery({
    queryKey: user ? ([...qk.clientes(user.id), 'paged', ativosOnly] as const) : (['clientes', 'none'] as const),
    queryFn: async ({ pageParam }) => {
      const { sb, uid } = requireClient(user)
      return fetchClientesComUltimoContatoPage(sb, uid, {
        ativosApenas: ativosOnly,
        cursor: pageParam ?? null,
        limit: CLIENTES_PAGE_SIZE,
      })
    },
    initialPageParam: null as { nome: string; id: string } | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(supabase && user),
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

export function useClientesKpis(user: User | null) {
  return useQuery({
    queryKey: user ? (['clientes', user.id, 'kpis'] as const) : (['clientes', 'kpis', 'none'] as const),
    queryFn: () => {
      const { sb, uid } = requireClient(user)
      return fetchClientesKpisSummary(sb, uid)
    },
    enabled: Boolean(supabase && user),
  })
}

/** Lista completa para selectores (ex.: novo orçamento). */
export function useClientesForPicker(user: User | null, opts?: { ativosApenas?: boolean }) {
  const ativosOnly = opts?.ativosApenas === true
  return useQuery({
    queryKey: user ? qk.clientesPicker(user.id, ativosOnly) : (['clientes', 'picker', 'none'] as const),
    queryFn: () => {
      const { sb, uid } = requireClient(user)
      return listClientesComUltimoContato(sb, uid, { ativosApenas: ativosOnly })
    },
    enabled: Boolean(supabase && user),
  })
}

/** Lista completa para a vista em planilha (Glide). */
export function useClientesForPlanilha(user: User | null) {
  return useQuery({
    queryKey: user ? ([...qk.clientes(user.id), 'planilha'] as const) : (['clientes', 'planilha', 'none'] as const),
    queryFn: () => {
      const { sb, uid } = requireClient(user)
      return listClientesComUltimoContato(sb, uid, {})
    },
    enabled: Boolean(supabase && user),
  })
}

export function useCliente(user: User | null, id: string | undefined) {
  return useQuery({
    queryKey: user && id ? qk.cliente(user.id, id) : ['cliente', 'none'],
    queryFn: () => {
      const { sb, uid } = requireClient(user)
      return getCliente(sb, uid, id!)
    },
    enabled: Boolean(supabase && user && id),
  })
}

export function useOrcamentos(user: User | null) {
  return useQuery({
    queryKey: user ? qk.orcamentos(user.id) : ['orcamentos', 'none'],
    queryFn: () => {
      const { sb, uid } = requireClient(user)
      return listOrcamentos(sb, uid)
    },
    enabled: Boolean(supabase && user),
  })
}

/** Orçamentos em páginas (lista / tabela); Kanban continua a usar `useOrcamentos`. */
export function useOrcamentosInfinite(user: User | null) {
  return useInfiniteQuery({
    queryKey: user ? ([...qk.orcamentos(user.id), 'infinite'] as const) : (['orcamentos', 'none', 'inf'] as const),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const { sb, uid } = requireClient(user)
      return listOrcamentosPage(sb, uid, { offset: pageParam, limit: ORCAMENTOS_PAGE_SIZE })
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < ORCAMENTOS_PAGE_SIZE) return undefined
      return allPages.reduce((acc, p) => acc + p.length, 0)
    },
    enabled: Boolean(supabase && user),
  })
}

export function useOrcamento(user: User | null, id: string | undefined) {
  return useQuery({
    queryKey: user && id ? qk.orcamento(user.id, id) : ['orcamento', 'none'],
    queryFn: () => {
      const { sb, uid } = requireClient(user)
      return getOrcamento(sb, uid, id!)
    },
    enabled: Boolean(supabase && user && id),
  })
}

export function useOrcamentosByCliente(user: User | null, clienteId: string | undefined) {
  return useQuery({
    queryKey: user && clienteId ? qk.orcamentosCliente(user.id, clienteId) : ['orcamentosCliente', 'none'],
    queryFn: () => {
      const { sb, uid } = requireClient(user)
      return listOrcamentosByCliente(sb, uid, clienteId!)
    },
    enabled: Boolean(supabase && user && clienteId),
  })
}

export function useProdutos(user: User | null, opts?: { ativosApenas?: boolean }) {
  const ativos = opts?.ativosApenas ?? false
  return useQuery({
    queryKey: user ? [...qk.produtos(user.id), ativos ? 'ativos' : 'todos'] : ['produtos', 'none'],
    queryFn: () => {
      const { sb, uid } = requireClient(user)
      return listProdutos(sb, uid, { ativosApenas: ativos })
    },
    enabled: Boolean(supabase && user),
  })
}

export function useInteracoes(user: User | null, clienteId: string | undefined) {
  return useInfiniteQuery({
    queryKey: user && clienteId ? ([...qk.interacoes(user.id, clienteId), 'paged'] as const) : (['interacoes', 'none'] as const),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const { sb, uid } = requireClient(user)
      return listInteracoesPage(sb, uid, clienteId!, {
        offset: pageParam,
        limit: INTERACOES_PAGE_SIZE,
      })
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < INTERACOES_PAGE_SIZE) return undefined
      return allPages.reduce((acc, p) => acc + p.length, 0)
    },
    enabled: Boolean(supabase && user && clienteId),
  })
}

function invalidateOrcamentoRelated(qc: ReturnType<typeof useQueryClient>, userId: string, clienteId?: string) {
  void qc.invalidateQueries({ queryKey: qk.orcamentos(userId) })
  void qc.invalidateQueries({ queryKey: qk.dashboard(userId) })
  void qc.invalidateQueries({ queryKey: qk.clientes(userId) })
  if (clienteId) {
    void qc.invalidateQueries({ queryKey: qk.interacoes(userId, clienteId) })
    void qc.invalidateQueries({ queryKey: qk.orcamentosCliente(userId, clienteId) })
    void qc.invalidateQueries({ queryKey: qk.cliente(userId, clienteId) })
  }
}

export function useCreateCliente(user: User | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (row: Parameters<typeof createCliente>[2]) => {
      const { sb, uid } = requireClient(user)
      return createCliente(sb, uid, row)
    },
    onSuccess: () => {
      if (user) void qc.invalidateQueries({ queryKey: qk.clientes(user.id) })
      if (user) void qc.invalidateQueries({ queryKey: qk.dashboard(user.id) })
    },
  })
}

export function useUpdateCliente(user: User | null, id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: ClienteUpdate) => {
      const { sb, uid } = requireClient(user)
      return updateCliente(sb, uid, id, patch)
    },
    onSuccess: () => {
      if (user) {
        void qc.invalidateQueries({ queryKey: qk.clientes(user.id) })
        void qc.invalidateQueries({ queryKey: qk.cliente(user.id, id) })
      }
    },
  })
}

const BULK_CLIENTE_CONCURRENCY = 6

/** Vários `updateCliente` em paralelo (com limite) — edição em massa na planilha. */
export function useBulkPatchClientes(user: User | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (items: { id: string; patch: ClienteUpdate }[]) => {
      const { sb, uid } = requireClient(user)
      for (let i = 0; i < items.length; i += BULK_CLIENTE_CONCURRENCY) {
        const chunk = items.slice(i, i + BULK_CLIENTE_CONCURRENCY)
        await Promise.all(chunk.map(({ id, patch }) => updateCliente(sb, uid, id, patch)))
      }
    },
    onSuccess: (_data, items) => {
      if (!user) return
      void qc.invalidateQueries({ queryKey: qk.clientes(user.id) })
      void qc.invalidateQueries({ queryKey: qk.dashboard(user.id) })
      const ids = new Set(items.map((x) => x.id))
      for (const id of ids) {
        void qc.invalidateQueries({ queryKey: qk.cliente(user.id, id) })
      }
    },
  })
}

export function useCreateOrcamento(user: User | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (row: Parameters<typeof createOrcamento>[2]) => {
      const { sb, uid } = requireClient(user)
      return createOrcamento(sb, uid, row)
    },
    onSuccess: (_d, vars) => {
      if (user) invalidateOrcamentoRelated(qc, user.id, vars.cliente_id)
    },
  })
}

export function useCreateProduto(user: User | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (row: Parameters<typeof createProduto>[2]) => {
      const { sb, uid } = requireClient(user)
      return createProduto(sb, uid, row)
    },
    onSuccess: () => {
      if (user) void qc.invalidateQueries({ queryKey: qk.produtos(user.id) })
    },
  })
}

export function useUpdateProduto(user: User | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; patch: ProdutoUpdate }) => {
      const { sb, uid } = requireClient(user)
      return updateProduto(sb, uid, args.id, args.patch)
    },
    onSuccess: () => {
      if (user) {
        void qc.invalidateQueries({ queryKey: qk.produtos(user.id) })
        void qc.invalidateQueries({ queryKey: qk.orcamentos(user.id) })
        void qc.invalidateQueries({ queryKey: qk.dashboard(user.id) })
      }
    },
  })
}

export function useApplyOrcamentoUpdate(user: User | null) {
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
      const { sb } = requireClient(user)
      return applyOrcamentoUpdate(sb, {
        orcamentoId: args.orcamentoId,
        status: args.status,
        followUpAt: args.followUpAt,
        note: args.note,
        lostReason: args.lostReason,
      })
    },
    onSuccess: (_d, args) => {
      if (user) invalidateOrcamentoRelated(qc, user.id, args.clienteId)
      if (user) void qc.invalidateQueries({ queryKey: qk.orcamento(user.id, args.orcamentoId) })
    },
  })
}

export function usePatchOrcamento(user: User | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: {
      id: string
      clienteId: string
      patch: { tax_id?: string | null; produto_id?: string | null; produto_descricao?: string }
    }) => {
      const { sb, uid } = requireClient(user)
      return patchOrcamento(sb, uid, args.id, args.patch)
    },
    onSuccess: (_d, args) => {
      if (user) {
        void qc.invalidateQueries({ queryKey: qk.orcamento(user.id, args.id) })
        invalidateOrcamentoRelated(qc, user.id, args.clienteId)
      }
    },
  })
}

export function useCreateInteracao(user: User | null, clienteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (row: Omit<Parameters<typeof createInteracao>[2], 'cliente_id'>) => {
      const { sb, uid } = requireClient(user)
      return createInteracao(sb, uid, { ...row, cliente_id: clienteId })
    },
    onSuccess: () => {
      if (user) {
        void qc.invalidateQueries({ queryKey: qk.interacoes(user.id, clienteId) })
        void qc.invalidateQueries({ queryKey: qk.dashboard(user.id) })
        void qc.invalidateQueries({ queryKey: qk.clientes(user.id) })
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
