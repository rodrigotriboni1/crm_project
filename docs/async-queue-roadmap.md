# Roadmap: filas e processamento assíncrono

Objetivo: desacoplar **importações em massa**, **webhooks** (WhatsApp/Slack futuros) e **automações** do request HTTP do browser.

## Opções

### A) Supabase Queues (nativo, em evolução)

- **Prós:** Mesmo projeto Supabase, menos moving parts, boa para protótipo de outbox.
- **Contras:** Menos maduro que filas dedicadas; limites e semântica de entrega a confirmar na doc atual do produto.

### B) Fila externa (SQS, Cloud Tasks, RabbitMQ, QStash)

- **Prós:** Retries, DLQ, métricas e padrões de idempotência bem documentados; escala horizontal de workers clara.
- **Contras:** Mais custo operacional; secrets e VPC (se aplicável).

### C) Postgres como fila (`outbox_events` + worker com `FOR UPDATE SKIP LOCKED`)

- **Prós:** Transacional com o CRM (commit único); sem novo serviço na fase 1.
- **Contras:** Workers precisam de cron/Edge scheduled ou processo sempre ligado; cuidado com poison messages.

## Decisão recomendada (fase atual)

1. **Curto prazo:** implementar **Outbox em Postgres** (`outbox_events`: `id`, `user_id`, `type`, `payload`, `created_at`, `processed_at`) + **Edge Function agendada** ou worker leve que consome em batches com `SKIP LOCKED`.
2. **Quando volume ou integrações externas exigirem:** introduzir **QStash ou SQS** como destino do outbox (adapter), mantendo o mesmo contrato de evento no domínio.
3. **Supabase Queues:** reavaliar quando a feature estiver estável no vosso plano/plataforma; útil se quiserem consolidar tudo no mesmo vendor.

## Contratos mínimos (antes de código)

- **Idempotência:** `event_id` ou hash `(type, entity_id, version)` único.
- **Retry:** backoff exponencial; **DLQ** ou tabela `failed_events` com motivo.
- **Nunca** chamar WhatsApp/Slack/OpenRouter em loop síncrono no cliente.

## Fora de escopo imediato

- Microserviços dedicados só a mensageria (só após métricas de fila > limiar acordado).
