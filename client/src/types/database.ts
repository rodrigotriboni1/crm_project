import type { InteracaoCanal } from '@/lib/interacaoCanal'
import type { ClienteDocumentEnrichment } from '@/types/clienteDocumentEnrichment'

export type ClienteTipo = 'novo' | 'recompra'

export type OrcamentoStatus =
  | 'novo_contato'
  | 'orcamento_enviado'
  | 'dormindo'
  | 'ganho'
  | 'perdido'

export type Produto = {
  id: string
  user_id: string
  nome: string
  codigo: string | null
  categoria: string | null
  descricao: string | null
  unidade: string
  especificacoes: Record<string, unknown>
  ativo: boolean
  created_at: string
  updated_at: string
}

export type ProdutoUpdate = Partial<
  Omit<Produto, 'id' | 'user_id' | 'created_at' | 'updated_at'>
>

export type Cliente = {
  id: string
  user_id: string
  nome: string
  /** CPF (11) ou CNPJ (14) — apenas dígitos na persistência. */
  tax_id: string | null
  /** Dados estruturados da consulta ao documento (CNPJ BrasilAPI; CPF placeholder). */
  document_enrichment: ClienteDocumentEnrichment | null
  tipo: ClienteTipo
  whatsapp: string | null
  telefone: string | null
  produtos_habituais: string | null
  observacoes: string | null
  cor: string | null
  iniciais: string | null
  created_at: string
  updated_at: string
}

export type Orcamento = {
  id: string
  user_id: string
  cliente_id: string
  /** Catálogo opcional; texto exibido continua em produto_descricao. */
  produto_id: string | null
  /** Sequencial por usuário para referência curta (ex.: 00000001). */
  display_num: number
  /** CPF ou CNPJ do cartão de oportunidade (pode diferir do cliente). */
  tax_id: string | null
  produto_descricao: string
  valor: number
  status: OrcamentoStatus
  data_orcamento: string
  follow_up_at: string | null
  /** Preenchido quando status = perdido; default no servidor «Não informado». */
  lost_reason: string | null
  created_at: string
  updated_at: string
}

export type Interacao = {
  id: string
  user_id: string
  cliente_id: string
  orcamento_id: string | null
  canal: InteracaoCanal
  anotacao: string
  data_contato: string
  created_at: string
}

export type ClienteUpdate = Partial<
  Omit<Cliente, 'id' | 'user_id' | 'created_at' | 'updated_at'>
>

export type ClienteListItem = Cliente & { ultimo_contato: string | null }

export type AssistantChatTurn = { role: 'user' | 'assistant'; content: string }

export type AssistantChatThread = {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export type AssistantChatMessage = {
  id: string
  thread_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}
