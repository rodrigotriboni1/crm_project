# Organizações (multi-tenant) — implementado

**Estado:** implementado no código e na migração `20260402120000_organizations_multi_tenant.sql`. Rollout em produção só após `supabase db push` em staging e validação manual.

## O que foi feito

- Tabelas `organizations` e `organization_members`; RLS por membro.
- Coluna `organization_id` (NOT NULL) em `clientes`, `orcamentos`, `interacoes`, `produtos`, `assistant_chat_threads`; `openrouter_chat_rate` passou a PK por `organization_id`.
- Backfill: uma organização por perfil existente; utilizadores só com dados de negócio sem perfil também recebem org + owner.
- `user_id` nas linhas de negócio mantido como criador; isolamento por org + RLS.
- RPCs com `p_organization_id` e verificação de membro: `list_clientes_com_ultimo_contato`, `list_clientes_com_ultimo_contato_page`, `clientes_kpis_summary`, `import_clientes_batch`, `consume_openrouter_chat_rate`.
- Signup: `handle_new_user` cria org default + membro `owner` (se ainda não existir membro).
- `create_organization(p_name)` para utilizadores sem org (UI com CTA no layout).
- Cliente React: `OrganizationContext`, persistência da org activa em `localStorage`, selector no layout, queries e React Query keys incluem `organizationId`.
- Edge `openrouter-chat`: corpo JSON deve incluir `organizationId` (UUID); rate limit por organização.

## Checklist de rollout (staging → produção)

1. `supabase db push` (ou pipeline equivalente) na base de **staging**.
2. Redeploy da Edge Function `openrouter-chat` (assinatura RPC alterada).
3. Dois utilizadores na mesma org: confirmar dados partilhados (clientes/orçamentos).
4. Um utilizador em duas orgs: trocar selector e confirmar isolamento de listagens e KPIs.
5. Assistente: conversas e rate limit por org activa.
6. Produção: janela de manutenção se necessário; monitorizar erros PostgREST/RPC após push.

## Referências

- [supabase-migration-verify.md](supabase-migration-verify.md) — verificação de funções SQL.
- Migração: [supabase/migrations/20260402120000_organizations_multi_tenant.sql](../supabase/migrations/20260402120000_organizations_multi_tenant.sql).

## Fora do âmbito actual

Convites por email, papéis finos (além de owner/member), billing por org, JWT custom com `org_id`.
