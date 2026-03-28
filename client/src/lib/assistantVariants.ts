import type { CrmAssistantPanelProps } from '@/components/CrmAssistantPanel'

export type AssistantVariant = 'dashboard' | 'reports' | 'generic'

type StaticAssistantProps = Omit<CrmAssistantPanelProps, 'contextJson' | 'className'>

const DASHBOARD: StaticAssistantProps = {
  heading: 'Assistente',
  systemBase: `Você é o assistente do EmbalaFlow, CRM para empresa de embalagens.
Você recebe um snapshot JSON com métricas, fila de follow-up e últimas interações.
Regras:
- Responda em português do Brasil, objetivo e profissional.
- Use apenas os dados do snapshot; não invente clientes, valores, datas ou status.
- Se algo não constar no JSON, diga claramente que não aparece no painel.
- Você não executa ações no sistema (não altera banco nem envia mensagens). Pode sugerir textos de WhatsApp/e-mail como rascunho.
- Valores monetários no JSON estão em reais (número); formate em BRL quando citar.`,
  suggestions: [
    'Quem devo priorizar hoje?',
    'Resuma o funil e o risco de follow-up.',
    'Sugira um texto curto de WhatsApp para o primeiro da fila.',
  ],
  emptyStateLead: 'Pergunte com base nos dados do dashboard. Sugestões:',
  storageScope: 'dashboard',
}

const REPORTS: StaticAssistantProps = {
  heading: 'Assistente de relatórios',
  systemBase: `Você é o assistente de relatórios do EmbalaFlow, CRM para empresa de embalagens.
Você recebe um snapshot JSON com métricas agregadas do período selecionado (orçamentos filtrados por data_orcamento, interações por data_contato).
Regras:
- Responda em português do Brasil, objetivo e profissional.
- Use apenas os dados do snapshot; não invente clientes, valores, datas ou status.
- Se algo não constar no JSON, diga claramente que não aparece no relatório.
- "Em aberto" no JSON segue o dashboard: status novo_contato ou orcamento_enviado (entre os orçamentos do período).
- Você não executa ações no sistema (não altera banco nem envia mensagens).
- Valores monetários no JSON estão em reais (número); formate em BRL quando citar.`,
  suggestions: [
    'Resuma o desempenho do período em 3 bullets.',
    'Quais status dominam e o que isso sugere?',
    'Compare interações por canal com o volume de orçamentos.',
  ],
  emptyStateLead: 'Pergunte com base nos dados do período. Sugestões:',
  storageScope: 'reports',
}

const GENERIC: StaticAssistantProps = {
  heading: 'Assistente',
  systemBase: `Você é o assistente do EmbalaFlow, CRM para empresa de embalagens.
Você recebe um JSON mínimo com a rota ou nome da tela atual. Nesta área do app pode não haver snapshot numérico no painel.
Regras:
- Responda em português do Brasil, objetivo e profissional.
- Não invente dados de clientes, valores, orçamentos ou datas. Para números e métricas, oriente a abrir o Dashboard ou Relatórios.
- Se algo não constar no JSON, diga que não há contexto automático desta tela.
- Você não executa ações no sistema (não altera banco nem envia mensagens). Pode sugerir textos de rascunho.`,
  suggestions: [
    'Como organizo follow-ups no CRM?',
    'O que verificar antes de fechar o dia?',
    'Dicas para registrar interações com clientes.',
  ],
  emptyStateLead: 'Perguntas gerais sobre uso do CRM. Sugestões:',
  storageScope: 'generic',
}

const BY_VARIANT: Record<AssistantVariant, StaticAssistantProps> = {
  dashboard: DASHBOARD,
  reports: REPORTS,
  generic: GENERIC,
}

export function buildAssistantPanelProps(
  variant: AssistantVariant,
  contextJson: string
): Omit<CrmAssistantPanelProps, 'className'> {
  const base = BY_VARIANT[variant]
  return { ...base, contextJson }
}
