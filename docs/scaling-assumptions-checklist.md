# Checklist de premissas de escala (negócio)

Use este documento para **validar com produto/comercial** antes de investir em multi-tenant ou infra pesada.

## Modelo de tenant

| Pergunta | Opções | Impacto técnico |
|----------|--------|-----------------|
| Cada login é uma “empresa” isolada? | Sim (atual) | `user_id` + RLS atuais bastam para isolamento entre contas. |
| Várias pessoas da mesma empresa partilham dados? | Sim | Necessário `organization_id`, membros e RLS por org (migração grande). |
| Hierarquia (filial / equipa)? | Sim/ Não | Afeta políticas RLS e relatórios. |

## Metas de volume (preencher)

Valores abaixo são **placeholders de planeamento** — substituir após validação com produto/comercial.

- **MAU** (utilizadores activos mensais) alvo em 12 meses: **50** (rever trimestralmente)
- **Orçamentos** por utilizador no p99: **2 000** (lista paginada; Kanban continua a carregar o conjunto completo até haver modelo por coluna)
- **Interações** por cliente no p99: **500** (lista com “carregar mais” em blocos de 40)
- **Importações** Excel: linhas por operação típica / máxima: **200 / 5 000** (import em lotes vía RPC; ficheiros muito grandes → outbox futuro)

## Decisão registada (engenharia)

- **Modelo activo:** single-tenant por conta de login (`user_id`), alinhado ao schema atual.
- **B2B multi-utilizador:** **não aprovado para implementação** até decisão explícita de negócio; existe rascunho técnico em [scaling-org-spike.md](scaling-org-spike.md) apenas para discussão.
- **Otimizações locais:** paginação de clientes e interacções, KPIs de clientes via RPC, importação em batch, lista de orçamentos com «carregar mais»; índices e RLS em migrações Supabase.

## Decisão implícita até validação

- **Assumimos single-tenant por conta de login** (`user_id`), alinhado ao schema atual.
- **Otimizações locais** (paginação, RPC de listagens, índices, RLS performático) têm prioridade até existir commitment explícito em **B2B multi-utilizador**.

## Próximo passo se B2B for “sim”

1. Spike de modelo `organizations` + `organization_members` (sem merge em produção até aprovação). Ver [docs/scaling-org-spike.md](scaling-org-spike.md).
2. Plano de migração de dados existentes (`user_id` legado → org primária).
