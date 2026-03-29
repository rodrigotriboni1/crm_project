import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Enfileira evento para processamento assíncrono (outbox).
 * Idempotência opcional por organização quando `idempotencyKey` é definida.
 */
export async function enqueueOutboxEvent(
  sb: SupabaseClient,
  organizationId: string,
  eventType: string,
  opts?: { payload?: Record<string, unknown>; idempotencyKey?: string }
): Promise<string> {
  const { data, error } = await sb.rpc('enqueue_outbox_event', {
    p_organization_id: organizationId,
    p_event_type: eventType,
    p_payload: (opts?.payload ?? {}) as object,
    p_idempotency_key: opts?.idempotencyKey ?? null,
  })
  if (error) throw error
  if (typeof data !== 'string' || !data) {
    throw new Error('enqueue_outbox_event: resposta inválida')
  }
  return data
}
