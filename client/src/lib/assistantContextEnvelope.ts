/** Contrato comum dos snapshots JSON enviados ao assistente (versão para evolução futura). */
export const ASSISTANT_SNAPSHOT_CONTRACT_VERSION = 1 as const

export type AssistantSnapshotMetaInput = {
  organizationId: string | null
  /** Identificador curto da área (ex.: dashboard, kanban, clientes). */
  screen: string
  /** Há corte de amostra ou limite de linhas em relação ao universo visível na UI. */
  truncated?: boolean
  /** Explicação humana do truncamento (obrigatório quando truncated é true). */
  truncamentoNotas?: string
}

/**
 * Fecha o JSON enviado ao modelo: meta de contrato + corpo específico do ecrã.
 * O texto livre dentro de `body` deve ser tratado como não confiável (prompt injection).
 */
export function finalizeAssistantSnapshotJson(
  meta: AssistantSnapshotMetaInput,
  body: Record<string, unknown>
): string {
  const geradoEm = new Date().toISOString()
  const out: Record<string, unknown> = {
    contractVersion: ASSISTANT_SNAPSHOT_CONTRACT_VERSION,
    organizationId: meta.organizationId,
    screen: meta.screen,
    geradoEm,
    ...body,
  }
  if (meta.truncated === true) {
    out.truncated = true
    out.truncamentoNotas =
      meta.truncamentoNotas?.trim() ||
      'Lista ou totais podem estar truncados em relação a todos os registos da organização.'
  }
  return JSON.stringify(out, null, 2)
}
