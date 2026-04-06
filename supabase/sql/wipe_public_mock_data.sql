-- Limpa dados de aplicação em public (mantém schema, funções, RLS).
-- Só trunca tabelas que existem (compatível com projetos sem todas as migrações).
-- Não apaga auth.users por defeito (descomenta o DELETE no fim se quiseres contas novas).
-- Executar como postgres no SQL Editor do Supabase, ou: npx supabase db query --linked -f supabase/sql/wipe_public_mock_data.sql

do $wipe$
declare
  names text;
  want text[] := array[
    'assistant_chat_messages',
    'assistant_chat_threads',
    'interacoes',
    'orcamentos',
    'clientes',
    'produtos',
    'outbox_events',
    'organization_orcamento_display_seq',
    'organization_audit_log',
    'team_members',
    'teams',
    'organization_invitations',
    'organization_members',
    'organizations',
    'legal_entity_billing',
    'legal_entities',
    'openrouter_chat_rate',
    'profiles'
  ];
begin
  -- Ordem do array respeita FKs (ex.: organizations antes de legal_entities).
  select string_agg(format('public.%I', u.tbl), ', ' order by u.pos)
  into names
  from unnest(want) with ordinality as u(tbl, pos)
  join pg_class c on c.relname = u.tbl
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r';

  if names is null or names = '' then
    raise notice 'Nenhuma tabela da lista encontrada em public; nada a truncar.';
    return;
  end if;

  execute 'truncate table ' || names || ' restart identity cascade';
end;
$wipe$;

-- Opcional: remover todas as contas Auth (descomenta só se quiseres base totalmente vazia).
-- begin;
-- delete from auth.users;
-- commit;
