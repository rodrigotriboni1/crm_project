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

function dashboardBullets(parsed: Record<string, unknown>): string[] {
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

  if (out.length === 0) out.push('Snapshot do dashboard vazio ou em formato não reconhecido.')
  return out
}

function reportsBullets(parsed: Record<string, unknown>): string[] {
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
    const extra = trunc === true ? ' (lista truncada no envio ao modelo)' : ''
    out.push(`Amostra de orçamentos no contexto: ${amostra.length} linha(s)${extra}.`)
  }

  const notas = parsed.notas
  if (isRecord(notas)) {
    out.push('Notas de definição (período, “em aberto”, interações) incluídas no JSON.')
  }

  if (out.length <= 1 && !isRecord(periodo)) {
    out.unshift('Relatório: contexto mínimo ou ainda a carregar.')
  }
  return out
}

function genericBullets(parsed: Record<string, unknown>): string[] {
  const rota = parsed.rota
  const tela = parsed.tela
  const parts: string[] = [
    'Não há snapshot numérico automático desta área — o modelo só recebe a rota/tela.',
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
    if (Number.isNaN(d.getTime())) return `Dados gerados em: ${g}`
    return `Dados gerados em: ${d.toLocaleString('pt-BR')}`
  } catch {
    return `Dados gerados em: ${g}`
  }
}

/**
 * Lista legível do que o assistente está a usar como contexto (alinhado aos builders dashboard/reports/generic).
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
        bullets: dashboardBullets(parsed),
        footer,
      }
    case 'reports':
      return {
        summaryLabel: 'Indicadores enviados ao modelo',
        bullets: reportsBullets(parsed),
        footer,
      }
    case 'generic':
      return {
        summaryLabel: 'Contexto desta tela',
        bullets: genericBullets(parsed),
        footer: footer ?? undefined,
      }
  }
}
