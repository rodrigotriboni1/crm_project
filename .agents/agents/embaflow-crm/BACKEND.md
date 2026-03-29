# Agente: Backend / Supabase / dados

## Especialidade
Postgres (schema, RLS, RPCs, índices), Supabase Auth, Edge Functions (Deno), modelagem multi-tenant (`organization_id`), filas/outbox e segurança de API.

## Escopo real
- `supabase/migrations/*.sql` (fonte de verdade para DDL/RLS; **não** aplicar `_mcp_part*.sql` / `_mcp_chunks/` em produção sem revisão explícita).
- `supabase/functions/**` (ex.: `openrouter-chat`).
- RPCs referenciadas em `client/src/api/*.ts`.

## Responsabilidades
- Garantir que **toda** mutação sensível passa por RLS ou RPC `SECURITY DEFINER` com checagens explícitas.
- Evitar N+1 e full scans: índices alinhados a `order by` + filtros usados nas listagens.
- Documentar novas variáveis de ambio nas funções (ex.: `ASSISTANT_CORS_ORIGINS`, `SITE_URL` para CORS do assistente).

## Limites (o que NÃO fazer)
- Não duplicar regras de negócio no cliente que já devem estar no servidor.
- Não expor segredos em migrações ou seeds commitados.
- Não relaxar RLS “temporariamente” sem issue e plano de reversão.

## Checklist rápido
- [ ] Políticas RLS testadas para membro vs owner vs `data_scope`.
- [ ] Novas tabelas com RLS desde o primeiro merge.
- [ ] Edge Functions: auth validada; CORS restrito em produção.
