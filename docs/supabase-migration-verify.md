# Verificar migrações Supabase (escalabilidade)

Use este guia para confirmar que o projecto remoto tem as migrações necessárias e que o cliente **não** cai no caminho legado de listagem de clientes.

## Comandos

No directório do repositório (com [Supabase CLI](https://supabase.com/docs/guides/cli) autenticado):

```bash
supabase link --project-ref <SEU_PROJECT_REF>
supabase db push
# ou, só para inspeccionar o estado local vs remoto:
supabase migration list
```

## Migrações críticas para signup e insert em `clientes`

Se o cadastro de utilizadores falha com erro genérico (“Database error saving new user”) ou **novo cliente** falha com política RLS, confirme que o remoto inclui pelo menos:

- [20260430140600_fix_organization_audit_actor_signup.sql](../supabase/migrations/20260430140600_fix_organization_audit_actor_signup.sql) — `log_organization_audit` no signup (`auth.uid()` nulo) deixava de violar `actor_user_id NOT NULL`.
- [20260430140700_fix_clientes_insert_rls.sql](../supabase/migrations/20260430140700_fix_clientes_insert_rls.sql) — política `clientes_insert_org` alinhada a `user_can_mutate_cliente_row`.

Comando: `supabase migration list` — as colunas **Local** e **Remote** devem coincidir até à última migração; linhas só em **Local** indicam `supabase db push` pendente no projecto ligado.

## Migrações relevantes

| Ficheiro | Conteúdo |
|----------|----------|
| [supabase/migrations/20260331130000_scalability_indexes_rpc_rls.sql](../supabase/migrations/20260331130000_scalability_indexes_rpc_rls.sql) | Índices compostos em `orcamentos`, RPC `list_clientes_com_ultimo_contato`, RLS com `(select auth.uid())` |
| `20260401090000_scalability_pagination_batch.sql` (ou nome gerado na pasta `migrations`) | KPIs `clientes_kpis_summary`, paginação `list_clientes_com_ultimo_contato_page`, `import_clientes_batch`, índice `interacoes` composto |
| [supabase/migrations/20260402120000_organizations_multi_tenant.sql](../supabase/migrations/20260402120000_organizations_multi_tenant.sql) | `organizations`, `organization_id`, RLS por membro, RPCs com `p_organization_id`, `consume_openrouter_chat_rate(uuid,…)`, signup com org default |

## Verificação no SQL Editor (produção)

1. Função de listagem completa (deve existir):

   ```sql
   select proname from pg_proc
   join pg_namespace n on n.oid = pg_proc.pronamespace
   where n.nspname = 'public' and proname = 'list_clientes_com_ultimo_contato';
   ```

2. Função paginada (após aplicar a migração nova):

   ```sql
   select proname from pg_proc
   join pg_namespace n on n.oid = pg_proc.pronamespace
   where n.nspname = 'public' and proname = 'list_clientes_com_ultimo_contato_page';
   ```

3. Opcional — `EXPLAIN (ANALYZE, BUFFERS)` nas queries quentes com dados reais.

## Comportamento no cliente

- Se `list_clientes_com_ultimo_contato` **não** existir, [client/src/api/clientes.ts](../client/src/api/clientes.ts) usa o legado (duas queries + merge no browser). Corrigir aplicando migrações.
- A listagem principal de clientes usa paginação por cursor; a vista **Planilha** continua a usar a RPC completa (carregamento único).
- Após a migração multi-tenant, as RPCs de clientes exigem o parâmetro **`p_organization_id`**; o cliente envia a org activa do contexto React.
