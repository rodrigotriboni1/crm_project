import type { Interacao, Orcamento } from '@/types/database'
import { finalizeAssistantSnapshotJson } from '@/lib/assistantContextEnvelope'
import {
  ASSISTANT_DEFAULT_MAX_LOST_REASON,
  ASSISTANT_DEFAULT_MAX_NOTE,
  ASSISTANT_DEFAULT_MAX_OBS,
  clipAssistantText,
  maskTaxIdForAssistant,
} from '@/lib/assistantPii'
import type { Cliente } from '@/types/database'

const MAX_ORC = 20
const MAX_INT = 15

export function buildClienteDetailAgentContext(
  organizationId: string | null,
  args: {
    cliente: Cliente
    orcamentos: Orcamento[]
    interacoes: Interacao[]
  }
): string {
  const { cliente, orcamentos, interacoes } = args
  const orcSample = orcamentos.slice(0, MAX_ORC)
  const intSample = interacoes.slice(0, MAX_INT)
  const body = {
    cliente: {
      id: cliente.id,
      nome: cliente.nome,
      tipo: cliente.tipo,
      ativo: cliente.ativo,
      taxIdMascarado: maskTaxIdForAssistant(cliente.tax_id),
      whatsapp: cliente.whatsapp,
      telefone: cliente.telefone,
      observacoes: cliente.observacoes
        ? clipAssistantText(cliente.observacoes, ASSISTANT_DEFAULT_MAX_OBS)
        : null,
      produtosHabituais: cliente.produtos_habituais
        ? clipAssistantText(cliente.produtos_habituais, 120)
        : null,
    },
    orcamentosAmostra: orcSample.map((o) => ({
      id: o.id,
      display_num: o.display_num,
      status: o.status,
      valor: o.valor,
      dataOrcamento: o.data_orcamento,
      produto: clipAssistantText(o.produto_descricao, 100),
      followUpAt: o.follow_up_at,
      lostReason: o.lost_reason
        ? clipAssistantText(o.lost_reason, ASSISTANT_DEFAULT_MAX_LOST_REASON)
        : null,
    })),
    orcamentosAmostraTruncada: orcamentos.length > MAX_ORC,
    interacoesAmostra: intSample.map((i) => ({
      id: i.id,
      canal: i.canal,
      dataContato: i.data_contato,
      anotacao: clipAssistantText(i.anotacao || '', ASSISTANT_DEFAULT_MAX_NOTE),
    })),
    interacoesAmostraTruncada: interacoes.length > MAX_INT,
  }
  const truncated = body.orcamentosAmostraTruncada || body.interacoesAmostraTruncada
  const notas: string[] = []
  if (body.orcamentosAmostraTruncada) notas.push(`Orçamentos: amostra de ${MAX_ORC} de ${orcamentos.length}.`)
  if (body.interacoesAmostraTruncada) notas.push(`Interações: amostra de ${MAX_INT} de ${interacoes.length}.`)
  return finalizeAssistantSnapshotJson(
    {
      organizationId,
      screen: 'cliente_detail',
      truncated,
      truncamentoNotas: notas.join(' '),
    },
    body
  )
}
