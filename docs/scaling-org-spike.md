# Spike: organizações (B2B multi-utilizador) — rascunho

**Estado:** não implementado. Só avançar após “várias pessoas da mesma empresa partilham dados?” = **sim** no [scaling-assumptions-checklist.md](scaling-assumptions-checklist.md).

## Objectivo

Permitir vários logins a partilharem o mesmo conjunto de clientes, orçamentos e interacções, com RLS por `organization_id` em vez de apenas `user_id`.

## Modelo de dados (proposta)

- `organizations` — `id`, `name`, `created_at`, …
- `organization_members` — `organization_id`, `user_id`, `role` (`owner` | `member`), `created_at`, unique `(organization_id, user_id)`.
- Tabelas de domínio (`clientes`, `orcamentos`, `interacoes`, `produtos`, …): adicionar `organization_id uuid not null references organizations(id)`, migrar a partir de `user_id` do primeiro membro (cada utilizador actual → org de uma pessoa).

## RLS (esboço)

- Políticas passam a `organization_id in (select organization_id from organization_members where user_id = (select auth.uid()))` com variantes por papel se necessário.
- Remover ou reescrever políticas actuais baseadas só em `user_id`.

## Migração de dados legados

1. Para cada `distinct user_id` em `clientes`, criar uma `organizations` e um `organization_members` (owner).
2. Preencher `organization_id` em todas as linhas onde `user_id` corresponde ao dono da org criada.
3. Índices compostos novos: `(organization_id, …)` espelhando os actuais `(user_id, …)`.

## Riscos

- Janela de manutenção ou backfill longo em bases grandes.
- Apps móveis / tokens em cache durante a mudança de políticas.
- Testes de regressão em todos os fluxos que hoje filtram por `user_id` no cliente.

## Próximo passo de engenharia

Implementar em branch isolada, ambiente de staging, sem `db push` em produção até assinatura de negócio.
