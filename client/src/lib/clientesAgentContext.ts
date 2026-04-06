import { finalizeAssistantSnapshotJson } from '@/lib/assistantContextEnvelope'
import type { ClienteListItem } from '@/types/database'

const MAX_CLIENTES_SAMPLE = 40

export type ClientesListKpis = {
  ativos: number
  arquivados: number
  recompras: number
  comTel: number
  semContato30: number
  pctTel: number
}

export function buildClientesListAgentContext(
  organizationId: string | null,
  args: {
    view: 'lista' | 'planilha'
    busca: string
    kpis: ClientesListKpis
    resumoFiltros: string
    listaFiltradaCount: number
    temMaisPaginas: boolean
    amostra: ClienteListItem[]
  }
): string {
  const sample = args.amostra.slice(0, MAX_CLIENTES_SAMPLE)
  const amostraTruncada = args.listaFiltradaCount > MAX_CLIENTES_SAMPLE
  const clientesAmostra = sample.map((c) => ({
    id: c.id,
    nome: c.nome,
    tipo: c.tipo,
    ativo: c.ativo,
    ultimoContato: c.ultimo_contato ?? null,
  }))
  const body = {
    vista: args.view,
    busca: args.busca.trim() || null,
    kpis: args.kpis,
    resumoFiltros: args.resumoFiltros,
    listaFiltradaCount: args.listaFiltradaCount,
    temMaisPaginas: args.temMaisPaginas,
    clientesAmostra,
    amostraTruncada,
    notaPrivacidade:
      'Documentos fiscais (CPF/CNPJ) não são enviados ao modelo nesta vista; use o detalhe do cliente para contexto com documento mascarado.',
  }
  const truncated = amostraTruncada || args.temMaisPaginas
  const notas: string[] = []
  if (amostraTruncada) {
    notas.push(
      `Amostra de ${MAX_CLIENTES_SAMPLE} clientes em ${args.listaFiltradaCount} após filtros (lista actual).`
    )
  }
  if (args.temMaisPaginas) {
    notas.push('Existem mais páginas na listagem; o snapshot cobre só a primeira página carregada.')
  }
  return finalizeAssistantSnapshotJson(
    {
      organizationId,
      screen: args.view === 'planilha' ? 'clientes_planilha' : 'clientes',
      truncated,
      truncamentoNotas: notas.join(' '),
    },
    body
  )
}
