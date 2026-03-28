import { openrouterChat } from '@/api/openrouter'

const SYSTEM = `És um assistente técnico de importação de CRM. Recebes cabeçalhos de colunas de uma folha Excel e algumas linhas de exemplo (JSON).
Deves mapear cada nome de coluna EXACTO (como aparece em headers) para um dos campos alvo do CRM, ou ignorar.

Campos alvo permitidos (valor exato):
- nome — obrigatório para criar cliente; nome da empresa ou pessoa
- tax_id — CPF ou CNPJ
- whatsapp — número WhatsApp
- telefone — telefone fixo ou móvel
- tipo — coluna que indica novo cliente vs recompra (valores variados no Excel)
- produtos_habituais — texto livre
- observacoes — notas

Regras:
- Só podes usar estes valores como destino. Se uma coluna não servir, não a incluas no mapping.
- No máximo uma coluna deve mapear para "nome" (a mais provável).
- tax_id só se a coluna for claramente documento brasileiro.

Responde APENAS com um único objeto JSON válido, sem markdown, sem texto antes ou depois, no formato:
{"mapping":{"<nome exato da coluna>":"<campo alvo>",...},"warnings":["opcional"]}`

export type AiImportMappingResult = {
  mapping: Record<string, string>
  warnings?: string[]
}

export function extractJsonObject(text: string): unknown {
  const t = text.trim()
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t)
  const body = fence ? fence[1].trim() : t
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('Resposta da IA sem JSON.')
  return JSON.parse(body.slice(start, end + 1)) as unknown
}

export function parseAiImportResult(raw: unknown): AiImportMappingResult {
  if (!raw || typeof raw !== 'object') throw new Error('JSON inválido da IA.')
  const o = raw as { mapping?: unknown; warnings?: unknown }
  if (!o.mapping || typeof o.mapping !== 'object') throw new Error('Falta "mapping" na resposta da IA.')
  const mapping: Record<string, string> = {}
  for (const [k, v] of Object.entries(o.mapping as Record<string, unknown>)) {
    if (typeof v === 'string' && v.trim()) mapping[k] = v.trim()
  }
  const warnings = Array.isArray(o.warnings)
    ? o.warnings.filter((w): w is string => typeof w === 'string')
    : []
  return { mapping, warnings }
}

export async function suggestClienteColumnMapping(
  headers: string[],
  sampleRows: string[][]
): Promise<AiImportMappingResult> {
  const userPayload = JSON.stringify(
    { headers, sampleRows: sampleRows.slice(0, 10) },
    null,
    0
  )
  const reply = await openrouterChat([
    { role: 'system', content: SYSTEM },
    { role: 'user', content: userPayload },
  ])
  const parsed = extractJsonObject(reply)
  return parseAiImportResult(parsed)
}
