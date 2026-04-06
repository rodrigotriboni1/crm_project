import type { AssistantVariant } from '@/lib/assistantVariants'

export type AssistantScreenSummary = {
  /** Texto curto para o `<summary>` do painel */
  summaryLabel: string
  bullets: string[]
  /** Linha opcional abaixo da lista (ex.: hora de geração do snapshot) */
  footer?: string
}

function brl(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x)
}

/** Parse seguro do JSON enviado ao modelo. */
export function parseAssistantContextJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

/** Meta comum do contrato de snapshot (envelope). */
function contractMetaBullets(parsed: Record<string, unknown>): string[] {
  const out: string[] = []
  const cv = parsed.contractVersion
  if (typeof cv === 'number') out.push(`Contrato de contexto v${cv}.`)
  const scr = parsed.screen
  if (typeof scr === 'string') out.push(`Área: ${scr}.`)
  const oid = parsed.organizationId
  if (typeof oid === 'string' && oid.length > 0) {
    out.push(`Organização (id): ${oid.slice(0, 8)}…`)
  }
  if (parsed.truncated === true) {
    const tn = parsed.truncamentoNotas
    out.push(
      typeof tn === 'string' && tn.trim()
        ? `Truncamento: ${tn}`
        : 'Truncamento: o JSON pode ser apenas uma amostra.'
    )
  }
  return out
}

function dashboardBodyBullets(parsed: Record<string, unknown>): string[] {
  const out: string[] = []
  const hoje = parsed.hoje
  if (typeof hoje === 'string') out.push(`Data de referência (hoje): ${hoje}`)
  const janela = parsed.janelaFollowUpDias
  if (typeof janela === 'number') out.push(`Janela de alertas de follow-up: ${janela} dias`)

  const m = parsed.metricas
  if (isRecord(m)) {
    const tc = m.totalClientes
    const oa = m.orcamentosEmAberto
    const vp = m.valorPipelineAberto
    const od = m.orcamentosDormindo
    const cnm = m.clientesNovosMes
    const ogm = m.orcamentosGanhosMes
    const parts: string[] = []
    if (typeof tc === 'number') parts.push(`${tc} clientes`)
    if (typeof oa === 'number') parts.push(`${oa} orçamentos em aberto`)
    if (typeof vp === 'number') parts.push(`pipeline ${brl(Number(vp))}`)
    if (typeof od === 'number') parts.push(`${od} dormindo`)
    if (typeof cnm === 'number') parts.push(`${cnm} clientes novos no mês`)
    if (typeof ogm === 'number') parts.push(`${ogm} ganhos no mês`)
    if (parts.length) out.push(`Métricas do painel: ${parts.join('; ')}.`)
  }

  const fila = parsed.filaFollowUp
  if (Array.isArray(fila)) {
    out.push(`Fila de follow-up enviada ao modelo: ${fila.length} orçamento(s) com datas na janela.`)
  }

  const ult = parsed.ultimasInteracoes
  if (Array.isArray(ult)) {
    out.push(`Últimas interações no snapshot: ${ult.length} registo(s).`)
  }

  if (out.length === 0) out.push('Corpo do snapshot do dashboard vazio ou em formato não reconhecido.')
  return out
}

function reportsBodyBullets(parsed: Record<string, unknown>): string[] {
  const out: string[] = []
  const periodo = parsed.periodo
  if (isRecord(periodo)) {
    const s = periodo.start
    const e = periodo.end
    if (typeof s === 'string' && typeof e === 'string') out.push(`Período do relatório: ${s} a ${e}`)
  }

  const tot = parsed.totais
  if (isRecord(tot)) {
    const t = tot.totalOrcamentosNoPeriodo
    const ab = tot.valorEmAbertoNoPeriodo
    const gn = tot.valorGanhoNoPeriodo
    const parts: string[] = []
    if (typeof t === 'number') parts.push(`${t} orçamentos`)
    if (typeof ab === 'number') parts.push(`${brl(Number(ab))} em aberto`)
    if (typeof gn === 'number') parts.push(`${brl(Number(gn))} ganhos`)
    if (parts.length) out.push(`Totais do período: ${parts.join('; ')}.`)
  }

  const ps = parsed.porStatus
  if (isRecord(ps)) {
    const keys = Object.keys(ps).filter((k) => {
      const v = ps[k]
      return isRecord(v) && typeof v.count === 'number' && v.count > 0
    })
    out.push(`Quebra por estado: ${keys.length} estado(s) com movimento no JSON.`)
  }

  const ch = parsed.interacoesPorCanal
  if (Array.isArray(ch)) {
    const total = ch.reduce((a, row) => {
      if (!isRecord(row)) return a
      const c = row.count
      return a + (typeof c === 'number' ? c : 0)
    }, 0)
    out.push(`Interações por canal: ${ch.length} canal(is); ${total} interação(ões) no período.`)
  }

  const amostra = parsed.orcamentosAmostra
  const trunc = parsed.orcamentosAmostraTruncada
  if (Array.isArray(amostra)) {
    const extra = trunc === true ? ' (subconjunto do período)' : ''
    out.push(`Amostra de orçamentos no contexto: ${amostra.length} linha(s)${extra}.`)
  }

  const notas = parsed.notas
  if (isRecord(notas)) {
    out.push('Notas de definição (período, “em aberto”, interações) incluídas no JSON.')
  }

  const totLinhas = parsed.orcamentosResumoTotalLinhas
  if (typeof totLinhas === 'number') {
    out.push(`Total de linhas no resumo do período (antes da amostra): ${totLinhas}.`)
  }

  if (out.length === 0 && !isRecord(periodo)) {
    out.push('Relatório: corpo do contexto mínimo ou ainda a carregar.')
  }
  return out
}

function kanbanBodyBullets(parsed: Record<string, unknown>): string[] {
  const out: string[] = []
  const tf = parsed.totalFiltradoVisivel
  if (typeof tf === 'number') out.push(`Orçamentos visíveis com filtros actuais: ${tf}.`)
  const c = parsed.contagemPorEstado
  if (isRecord(c)) {
    const parts = Object.entries(c)
      .filter(([, n]) => typeof n === 'number' && n > 0)
      .map(([k, n]) => `${k}: ${n}`)
    if (parts.length) out.push(`Contagens por estado: ${parts.join(', ')}.`)
  }
  const am = parsed.cartoesAmostra
  if (Array.isArray(am)) {
    out.push(`Amostra de cartões no JSON: ${am.length}.`)
  }
  if (parsed.cargaKanbanTruncada === true) {
    const lim = parsed.limiteCargaKanban
    out.push(
      typeof lim === 'number'
        ? `Carga do Kanban limitada no servidor/cliente a ${lim} orçamentos recentes.`
        : 'Carga do Kanban truncada em relação ao total da organização.'
    )
  }
  if (parsed.amostraCartoesTruncada === true) {
    out.push('A amostra de cartões não cobre todos os visíveis na coluna.')
  }
  if (parsed.buscaTextual) {
    out.push('Há busca textual activa no funil.')
  }
  if (out.length === 0) out.push('Kanban: contexto vazio ou formato não reconhecido.')
  return out
}

function clientesBodyBullets(parsed: Record<string, unknown>): string[] {
  const out: string[] = []
  const v = parsed.vista
  if (v === 'planilha') out.push('Vista: planilha.')
  else if (v === 'lista') out.push('Vista: lista.')
  const k = parsed.kpis
  if (isRecord(k)) {
    const at = k.ativos
    const ar = k.arquivados
    if (typeof at === 'number' && typeof ar === 'number') {
      out.push(`KPIs globais (organização): ${at} ativos, ${ar} arquivados.`)
    }
  }
  const lc = parsed.listaFiltradaCount
  if (typeof lc === 'number') out.push(`Clientes na lista após filtros: ${lc}.`)
  const am = parsed.clientesAmostra
  if (Array.isArray(am)) out.push(`Amostra no JSON: ${am.length} cliente(s).`)
  if (parsed.temMaisPaginas === true) out.push('Há mais páginas na listagem (só a primeira está no snapshot).')
  const rf = parsed.resumoFiltros
  if (typeof rf === 'string' && rf.trim()) out.push(`Filtros: ${rf}.`)
  if (out.length === 0) out.push('Clientes: contexto mínimo.')
  return out
}

function clienteDetailBodyBullets(parsed: Record<string, unknown>): string[] {
  const out: string[] = []
  const est = parsed.estado
  if (typeof est === 'string') {
    if (est === 'a_carregar') {
      out.push('Dados do cliente ainda a carregar; o snapshot é provisório.')
      return out
    }
    if (est === 'nao_encontrado') {
      out.push('Cliente não encontrado ou sem permissão.')
      return out
    }
    if (est === 'sem_id') {
      out.push('Sem identificador de cliente na rota.')
      return out
    }
  }
  const cl = parsed.cliente
  if (isRecord(cl)) {
    const nome = cl.nome
    if (typeof nome === 'string') out.push(`Cliente: ${nome}.`)
    if (cl.taxIdMascarado) out.push('Documento fiscal enviado apenas mascarado.')
  }
  const oa = parsed.orcamentosAmostra
  if (Array.isArray(oa)) out.push(`Amostra de orçamentos: ${oa.length}.`)
  const ia = parsed.interacoesAmostra
  if (Array.isArray(ia)) out.push(`Amostra de interações: ${ia.length}.`)
  if (out.length === 0) out.push('Detalhe do cliente: contexto mínimo.')
  return out
}

function produtosBodyBullets(parsed: Record<string, unknown>): string[] {
  const out: string[] = []
  const tv = parsed.totalVisivel
  if (typeof tv === 'number') out.push(`Produtos visíveis após busca/filtros: ${tv}.`)
  const am = parsed.produtosAmostra
  if (Array.isArray(am)) out.push(`Amostra no JSON: ${am.length}.`)
  if (parsed.amostraTruncada === true) out.push('Amostra truncada.')
  if (parsed.porCategoria === true) out.push('Vista agrupada por categoria.')
  if (out.length === 0) out.push('Produtos: contexto mínimo.')
  return out
}

function orcamentosListBodyBullets(parsed: Record<string, unknown>): string[] {
  const out: string[] = []
  const fs = parsed.filtroStatus
  if (typeof fs === 'string') out.push(`Filtro de estado: ${fs}.`)
  const lv = parsed.linhasAposBuscaEStatus
  if (typeof lv === 'number') out.push(`Linhas após filtro e busca: ${lv}.`)
  const tc = parsed.totalCarregadosNaLista
  if (typeof tc === 'number') out.push(`Orçamentos carregados na lista (paginação): ${tc}.`)
  const am = parsed.orcamentosAmostra
  if (Array.isArray(am)) out.push(`Amostra no JSON: ${am.length}.`)
  if (parsed.amostraTruncada === true) out.push('Amostra truncada.')
  if (out.length === 0) out.push('Lista de orçamentos: contexto mínimo.')
  return out
}

function genericBullets(parsed: Record<string, unknown>): string[] {
  const rota = parsed.rota
  const tela = parsed.tela
  const parts: string[] = [
    'Não há snapshot de negócio detalhado — o modelo só recebe a rota/tela (área genérica do CRM).',
  ]
  if (typeof rota === 'string') parts.push(`Rota: ${rota}`)
  if (typeof tela === 'string' && tela) parts.push(`Tela: ${tela}`)
  return parts
}

function geradoEmFooter(parsed: Record<string, unknown>): string | undefined {
  const g = parsed.geradoEm
  if (typeof g !== 'string') return undefined
  try {
    const d = new Date(g)
    if (Number.isNaN(d.getTime())) return `Snapshot gerado em: ${g}`
    return `Snapshot gerado em: ${d.toLocaleString('pt-BR')}`
  } catch {
    return `Snapshot gerado em: ${g}`
  }
}

function mergeBullets(parsed: Record<string, unknown>, body: string[]): string[] {
  return [...contractMetaBullets(parsed), ...body]
}

/**
 * Lista legível do que o assistente está a usar como contexto.
 */
export function describeAssistantScreenContext(
  variant: AssistantVariant,
  parsed: unknown
): AssistantScreenSummary {
  if (!isRecord(parsed)) {
    return {
      summaryLabel: 'Contexto desta tela',
      bullets: ['Não foi possível ler o JSON de contexto.'],
    }
  }

  const footer = geradoEmFooter(parsed)

  switch (variant) {
    case 'dashboard':
      return {
        summaryLabel: 'Indicadores enviados ao modelo',
        bullets: mergeBullets(parsed, dashboardBodyBullets(parsed)),
        footer,
      }
    case 'reports':
      return {
        summaryLabel: 'Indicadores enviados ao modelo',
        bullets: mergeBullets(parsed, reportsBodyBullets(parsed)),
        footer,
      }
    case 'kanban':
      return {
        summaryLabel: 'Funil e amostra enviados ao modelo',
        bullets: mergeBullets(parsed, kanbanBodyBullets(parsed)),
        footer,
      }
    case 'clientes':
      return {
        summaryLabel: 'Lista de clientes (amostra)',
        bullets: mergeBullets(parsed, clientesBodyBullets(parsed)),
        footer,
      }
    case 'cliente_detail':
      return {
        summaryLabel: 'Detalhe do cliente',
        bullets: mergeBullets(parsed, clienteDetailBodyBullets(parsed)),
        footer,
      }
    case 'produtos':
      return {
        summaryLabel: 'Catálogo (amostra)',
        bullets: mergeBullets(parsed, produtosBodyBullets(parsed)),
        footer,
      }
    case 'orcamentos_list':
      return {
        summaryLabel: 'Lista de orçamentos (amostra)',
        bullets: mergeBullets(parsed, orcamentosListBodyBullets(parsed)),
        footer,
      }
    case 'generic': {
      const hasContract = typeof parsed.contractVersion === 'number'
      return {
        summaryLabel: 'Contexto desta tela',
        bullets: hasContract ? mergeBullets(parsed, genericBullets(parsed)) : genericBullets(parsed),
        footer: footer ?? undefined,
      }
    }
  }
}
