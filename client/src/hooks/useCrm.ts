import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import {
  applyOrcamentoUpdate,
  createCliente,
  createInteracao,
  createOrcamento,
  createProduto,
  fetchDashboard,
  getCliente,
  getOrcamento,
  listClientesComUltimoContato,
  listInteracoes,
  listOrcamentos,
  listOrcamentosByCliente,
  listProdutos,
  patchOrcamento,
  updateCliente,
  updateProduto,
} from '@/api/crm'
import { supabase } from '@/lib/supabase'
import { INTERACAO_CANAIS_USUARIO } from '@/lib/interacaoCanal'
import { qk } from '@/lib/queryKeys'
import type { ClienteTipo, ClienteUpdate, OrcamentoStatus, ProdutoUpdate } from '@/types/database'

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

export function useClientes(user: User | null) {
  return useQuery({
    queryKey: user ? qk.clientes(user.id) : ['clientes', 'none'],
    queryFn: () => {
      const { sb, uid } = requireClient(user)
      return listClientesComUltimoContato(sb, uid)
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
  return useQuery({
    queryKey: user && clienteId ? qk.interacoes(user.id, clienteId) : ['interacoes', 'none'],
    queryFn: () => {
      const { sb, uid } = requireClient(user)
      return listInteracoes(sb, uid, clienteId!)
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

export function orcamentoStatusLabel(s: OrcamentoStatus): string {
  switch (s) {
    case 'novo_contato':
      return 'Novo contato'
    case 'orcamento_enviado':
      return 'Orçamento enviado'
    case 'dormindo':
      return 'Dormindo'
    case 'ganho':
      return 'Ganho'
    case 'perdido':
      return 'Perdido'
    default:
      return s
  }
}

export const ORCAMENTO_STATUS_ORDER: OrcamentoStatus[] = [
  'novo_contato',
  'orcamento_enviado',
  'dormindo',
  'ganho',
  'perdido',
]

/** Re-export alinhado a `interacoes.canal` (CHECK no Postgres). */
export const CANAIS_CONTATO = INTERACAO_CANAIS_USUARIO
