# Checklist de premissas de escala (negócio)

Use este documento para **validar com produto/comercial** antes de investir em multi-tenant ou infra pesada.

## Modelo de tenant

| Pergunta | Opções | Impacto técnico |
|----------|--------|-----------------|
| Cada login é uma “empresa” isolada? | Sim (atual) | `user_id` + RLS atual bastam para isolamento entre contas. |
| Várias pessoas da mesma empresa partilham dados? | Sim | Necessário `organization_id`, membros e RLS por org (migração grande). |
| Hierarquia (filial / equipa)? | Sim/ Não | Afeta políticas RLS e relatórios. |

## Metas de volume (preencher)

- **MAU** (utilizadores ativos mensais) alvo em 12 meses: ______
- **Orçamentos** por utilizador no p99: ______
- **Interações** por cliente no p99: ______
- **Importações** Excel: linhas por operação típica / máxima: ______

## Decisão implícita até validação

- **Assumimos single-tenant por conta de login** (`user_id`), alinhado ao schema atual.
- **Otimizações locais** (paginação, RPC de listagens, índices, RLS performático) têm prioridade até existir commitment explícito em **B2B multi-utilizador**.

## Próximo passo se B2B for “sim”

1. Spike de modelo `organizations` + `organization_members` (sem merge em produção até aprovação).
2. Plano de migração de dados existentes (`user_id` legado → org primária).
