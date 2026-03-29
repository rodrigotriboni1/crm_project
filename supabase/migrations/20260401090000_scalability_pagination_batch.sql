-- Paginação de clientes, KPIs agregados, import em batch, índice interacções (user_id, cliente_id)

-- Índice para listagens por utilizador + cliente ordenadas por data
create index if not exists interacoes_user_cliente_data_idx
  on public.interacoes (user_id, cliente_id, data_contato desc);

-- KPIs globais do utilizador (evita carregar todas as fichas só para os cartões do topo)
create or replace function public.clientes_kpis_summary()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'ativos', count(*) filter (where c.ativo),
    'arquivados', count(*) filter (where not c.ativo),
    'recompras', count(*) filter (where c.ativo and c.tipo = 'recompra'),
    'com_telefone', count(*) filter (where c.ativo and (
      length(regexp_replace(coalesce(c.whatsapp, ''), '[^0-9]', '', 'g')) >= 8
      or length(regexp_replace(coalesce(c.telefone, ''), '[^0-9]', '', 'g')) >= 8
    )),
    'sem_contato_30', count(*) filter (where c.ativo and not exists (
      select 1
      from public.interacoes i
      where i.cliente_id = c.id
        and i.user_id = c.user_id
        and i.data_contato >= (now() - interval '30 days')
    ))
  )
  from public.clientes c
  where c.user_id = (select auth.uid());
$$;

comment on function public.clientes_kpis_summary() is
  'Agregados de clientes do utilizador autenticado (cartões KPI da listagem).';

grant execute on function public.clientes_kpis_summary() to authenticated;

-- Listagem paginada por cursor (nome asc, id asc) com último contacto
create or replace function public.list_clientes_com_ultimo_contato_page(
  p_ativos_apenas boolean default false,
  p_limit int default 150,
  p_cursor_nome text default null,
  p_cursor_id uuid default null
)
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
    and (
      (p_cursor_nome is null and p_cursor_id is null)
      or (c.nome, c.id) > (p_cursor_nome, p_cursor_id)
    )
  order by c.nome asc, c.id asc
  limit least(greatest(coalesce(p_limit, 150), 1), 500);
$$;

comment on function public.list_clientes_com_ultimo_contato_page(boolean, int, text, uuid) is
  'Página de clientes com último contacto; cursor (nome, id) para keyset pagination.';

grant execute on function public.list_clientes_com_ultimo_contato_page(boolean, int, text, uuid) to authenticated;

-- Importação em lote (uma ida ao servidor por chunk)
create or replace function public.import_clientes_batch(p_rows jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  elem jsonb;
  idx int := 0;
  n_ok int := 0;
  errs jsonb := '[]'::jsonb;
  uid uuid := auth.uid();
  v_tipo text;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  for elem in select jsonb_array_elements(coalesce(p_rows, '[]'::jsonb))
  loop
    begin
      v_tipo := lower(trim(coalesce(elem->>'tipo', 'novo')));
      if v_tipo not in ('novo', 'recompra') then
        v_tipo := 'novo';
      end if;

      insert into public.clientes (
        user_id,
        nome,
        tipo,
        tax_id,
        document_enrichment,
        ativo,
        whatsapp,
        telefone,
        produtos_habituais,
        observacoes,
        cor,
        iniciais
      ) values (
        uid,
        trim(elem->>'nome'),
        v_tipo,
        nullif(trim(elem->>'tax_id'), ''),
        case
          when elem ? 'document_enrichment' and jsonb_typeof(elem->'document_enrichment') = 'object'
          then elem->'document_enrichment'
          else null
        end,
        case
          when elem ? 'ativo' and (elem->>'ativo') in ('true', 'false')
          then (elem->>'ativo')::boolean
          else true
        end,
        nullif(trim(elem->>'whatsapp'), ''),
        nullif(trim(elem->>'telefone'), ''),
        nullif(trim(elem->>'produtos_habituais'), ''),
        nullif(trim(elem->>'observacoes'), ''),
        nullif(trim(elem->>'cor'), ''),
        nullif(trim(elem->>'iniciais'), '')
      );

      n_ok := n_ok + 1;
    exception
      when unique_violation then
        errs := errs || jsonb_build_array(jsonb_build_object(
          'index', idx,
          'msg', 'Documento duplicado (CPF/CNPJ já existe).'
        ));
      when others then
        errs := errs || jsonb_build_array(jsonb_build_object('index', idx, 'msg', SQLERRM));
    end;

    idx := idx + 1;
  end loop;

  return jsonb_build_object('inserted', n_ok, 'errors', errs);
end;
$$;

comment on function public.import_clientes_batch(jsonb) is
  'Insere várias fichas de cliente num único pedido; devolve contagem e erros por índice no array.';

grant execute on function public.import_clientes_batch(jsonb) to authenticated;
