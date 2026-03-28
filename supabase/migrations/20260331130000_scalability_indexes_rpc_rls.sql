-- Escalabilidade: índices compostos, RPC listagem clientes + último contacto, RLS com (select auth.uid())

-- Índices para filtros frequentes (Kanban, relatórios, contagens por período)
create index if not exists orcamentos_user_status_idx on public.orcamentos (user_id, status);
create index if not exists orcamentos_user_data_orcamento_idx on public.orcamentos (user_id, data_orcamento);
create index if not exists orcamentos_user_updated_at_idx on public.orcamentos (user_id, updated_at desc);
create index if not exists orcamentos_user_created_id_idx on public.orcamentos (user_id, created_at desc, id desc);

-- Último contacto por cliente no servidor (evita carregar todas as interações no client)
create or replace function public.list_clientes_com_ultimo_contato(p_ativos_apenas boolean default false)
returns table (
  id uuid,
  user_id uuid,
  nome text,
  tipo text,
  tax_id text,
  document_enrichment jsonb,
  ativo boolean,
  whatsapp text,
  telefone text,
  produtos_habituais text,
  observacoes text,
  cor text,
  iniciais text,
  created_at timestamptz,
  updated_at timestamptz,
  ultimo_contato timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    c.id,
    c.user_id,
    c.nome,
    c.tipo,
    c.tax_id,
    c.document_enrichment,
    c.ativo,
    c.whatsapp,
    c.telefone,
    c.produtos_habituais,
    c.observacoes,
    c.cor,
    c.iniciais,
    c.created_at,
    c.updated_at,
    (
      select max(i.data_contato)
      from public.interacoes i
      where i.cliente_id = c.id
        and i.user_id = c.user_id
    ) as ultimo_contato
  from public.clientes c
  where c.user_id = (select auth.uid())
    and (not p_ativos_apenas or c.ativo = true)
  order by c.nome asc;
$$;

comment on function public.list_clientes_com_ultimo_contato(boolean) is
  'Lista clientes do utilizador autenticado com max(data_contato) por cliente; substitui merge O(n) no browser.';

grant execute on function public.list_clientes_com_ultimo_contato(boolean) to authenticated;

-- RLS: (select auth.uid()) evita reavaliação por linha em tabelas grandes (recomendação Supabase)

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;

create policy "profiles_select_own"
  on public.profiles for select
  using ((select auth.uid()) = id);

create policy "profiles_update_own"
  on public.profiles for update
  using ((select auth.uid()) = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check ((select auth.uid()) = id);

drop policy if exists "clientes_all_own" on public.clientes;

create policy "clientes_all_own"
  on public.clientes for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "orcamentos_all_own" on public.orcamentos;

create policy "orcamentos_all_own"
  on public.orcamentos for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "interacoes_all_own" on public.interacoes;

create policy "interacoes_all_own"
  on public.interacoes for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "produtos_all_own" on public.produtos;

create policy "produtos_all_own"
  on public.produtos for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "assistant_threads_select_own" on public.assistant_chat_threads;
drop policy if exists "assistant_threads_insert_own" on public.assistant_chat_threads;
drop policy if exists "assistant_threads_update_own" on public.assistant_chat_threads;
drop policy if exists "assistant_threads_delete_own" on public.assistant_chat_threads;

create policy "assistant_threads_select_own"
  on public.assistant_chat_threads for select
  using ((select auth.uid()) = user_id);

create policy "assistant_threads_insert_own"
  on public.assistant_chat_threads for insert
  with check ((select auth.uid()) = user_id);

create policy "assistant_threads_update_own"
  on public.assistant_chat_threads for update
  using ((select auth.uid()) = user_id);

create policy "assistant_threads_delete_own"
  on public.assistant_chat_threads for delete
  using ((select auth.uid()) = user_id);

drop policy if exists "assistant_chat_messages_select" on public.assistant_chat_messages;
drop policy if exists "assistant_chat_messages_insert" on public.assistant_chat_messages;
drop policy if exists "assistant_chat_messages_delete" on public.assistant_chat_messages;

create policy "assistant_chat_messages_select"
  on public.assistant_chat_messages for select
  using (
    exists (
      select 1 from public.assistant_chat_threads t
      where t.id = thread_id and t.user_id = (select auth.uid())
    )
  );

create policy "assistant_chat_messages_insert"
  on public.assistant_chat_messages for insert
  with check (
    exists (
      select 1 from public.assistant_chat_threads t
      where t.id = thread_id and t.user_id = (select auth.uid())
    )
  );

create policy "assistant_chat_messages_delete"
  on public.assistant_chat_messages for delete
  using (
    exists (
      select 1 from public.assistant_chat_threads t
      where t.id = thread_id and t.user_id = (select auth.uid())
    )
  );
