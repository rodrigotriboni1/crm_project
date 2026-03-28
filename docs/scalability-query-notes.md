# Notas de EXPLAIN (staging / produção)

Executar no **SQL Editor** do Supabase (ou `psql`) com utilizador de teste com volume realista.

## Orçamentos — listagem paginada

Após deploy da paginação keyset, validar plano da query com `explain (analyze, buffers)` equivalente a:

- Filtro `user_id = '<uuid>'`
- Ordenação `created_at desc, id desc`
- Limite ~300

**Índice esperado:** `orcamentos_user_created_id_idx` (ver migração de escalabilidade).

## Clientes — último contacto

A função `list_clientes_com_ultimo_contato` usa subconsulta correlata `max(data_contato)` por cliente.

Com muitas interações por cliente, monitorizar; se necessário, evoluir para coluna desnormalizada `clientes.ultimo_contato_at` atualizada por trigger.

## Dashboard / relatórios

- Contagens com `count(*)` + `head: true` já são eficientes.
- Intervalos largos em `data_orcamento` devem usar índice `(user_id, data_orcamento)`.

## RLS

Após migração `(select auth.uid())`, repetir `EXPLAIN` nas queries quentes e comparar **Planning Time** / **Execution Time** com volume alto.
