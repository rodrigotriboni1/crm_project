-- Busca na listagem paginada por nome, produtos, CPF/CNPJ (dígitos) e telefone.
-- Import em lote: mesmo CPF/CNPJ funde dados (concatena texto e telefones) em vez de falhar.

drop function if exists public.list_clientes_com_ultimo_contato_page(uuid, boolean, int, text, uuid);

create or replace function public.list_clientes_com_ultimo_contato_page(
  p_organization_id uuid,
  p_ativos_apenas boolean default false,
  p_limit int default 150,
  p_cursor_nome text default null,
  p_cursor_id uuid default null,
  p_search text default null
)
returns table (
  id uuid, user_id uuid, organization_id uuid, nome text, tipo text, tax_id text,
  document_enrichment jsonb, ativo boolean, whatsapp text, telefone text,
  produtos_habituais text, observacoes text, cor text, iniciais text,
  created_at timestamptz, updated_at timestamptz, assigned_user_id uuid, ultimo_contato timestamptz
)
language sql stable security invoker set search_path = public as $$
  select c.id, c.user_id, c.organization_id, c.nome, c.tipo, c.tax_id, c.document_enrichment, c.ativo,
    c.whatsapp, c.telefone, c.produtos_habituais, c.observacoes, c.cor, c.iniciais, c.created_at, c.updated_at, c.assigned_user_id,
    (select max(i.data_contato) from public.interacoes i where i.cliente_id = c.id and i.organization_id = c.organization_id)
  from public.clientes c
  where c.organization_id = p_organization_id
    and exists (select 1 from public.organization_members m where m.organization_id = p_organization_id and m.user_id = (select auth.uid()))
    and public.user_can_access_cliente_row(c.organization_id, c.user_id, c.assigned_user_id)
    and (not p_ativos_apenas or c.ativo = true)
    and ((p_cursor_nome is null and p_cursor_id is null) or (c.nome, c.id) > (p_cursor_nome, p_cursor_id))
    and (
      nullif(trim(p_search), '') is null
      or (
        lower(c.nome) like '%' || lower(trim(p_search)) || '%'
        or lower(coalesce(c.produtos_habituais, '')) like '%' || lower(trim(p_search)) || '%'
        or (
          length(regexp_replace(trim(p_search), '[^0-9]', '', 'g')) >= 3
          and coalesce(c.tax_id, '') like '%' || regexp_replace(trim(p_search), '[^0-9]', '', 'g') || '%'
        )
        or (
          length(regexp_replace(trim(p_search), '[^0-9]', '', 'g')) >= 4
          and (
            regexp_replace(coalesce(c.whatsapp, ''), '[^0-9]', '', 'g')
              like '%' || regexp_replace(trim(p_search), '[^0-9]', '', 'g') || '%'
            or regexp_replace(coalesce(c.telefone, ''), '[^0-9]', '', 'g')
              like '%' || regexp_replace(trim(p_search), '[^0-9]', '', 'g') || '%'
          )
        )
      )
    )
  order by c.nome asc, c.id asc
  limit least(greatest(coalesce(p_limit, 150), 1), 500);
$$;

grant execute on function public.list_clientes_com_ultimo_contato_page(uuid, boolean, int, text, uuid, text) to authenticated;

create or replace function public.import_clientes_batch(p_organization_id uuid, p_rows jsonb)
returns jsonb language plpgsql security invoker set search_path = public as $fn$
declare
  elem jsonb;
  idx int := 0;
  n_ok int := 0;
  errs jsonb := '[]'::jsonb;
  uid uuid := auth.uid();
  v_tipo text;
  v_tax text;
  v_existing_id uuid;
  v_nome text;
  v_wa text;
  v_tel text;
  v_obs text;
  v_prod text;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.organization_members m where m.organization_id = p_organization_id and m.user_id = uid) then
    raise exception 'forbidden';
  end if;
  for elem in select jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    v_existing_id := null;
    v_tipo := lower(trim(coalesce(elem->>'tipo', 'novo')));
    if v_tipo not in ('novo', 'recompra') then v_tipo := 'novo'; end if;
    v_tax := nullif(trim(elem->>'tax_id'), '');
    v_nome := trim(coalesce(elem->>'nome', ''));
    v_wa := nullif(trim(elem->>'whatsapp'), '');
    v_tel := nullif(trim(elem->>'telefone'), '');
    v_obs := nullif(trim(elem->>'observacoes'), '');
    v_prod := nullif(trim(elem->>'produtos_habituais'), '');

    if v_tax is not null and length(v_tax) > 0 then
      select c.id into v_existing_id from public.clientes c
      where c.organization_id = p_organization_id and c.tax_id = v_tax
      limit 1;
    end if;

    if v_existing_id is not null then
      update public.clientes c set
        nome = case when length(v_nome) > length(coalesce(c.nome, '')) then v_nome else c.nome end,
        tipo = case when c.tipo = 'recompra' or v_tipo = 'recompra' then 'recompra'::text else c.tipo end,
        whatsapp = case
          when v_wa is null then c.whatsapp
          when c.whatsapp is null or trim(c.whatsapp) = '' then v_wa
          when regexp_replace(coalesce(c.whatsapp, ''), '[^0-9]', '', 'g') = regexp_replace(v_wa, '[^0-9]', '', 'g') then c.whatsapp
          else trim(c.whatsapp) || ' | ' || v_wa
        end,
        telefone = case
          when v_tel is null then c.telefone
          when c.telefone is null or trim(c.telefone) = '' then v_tel
          when regexp_replace(coalesce(c.telefone, ''), '[^0-9]', '', 'g') = regexp_replace(v_tel, '[^0-9]', '', 'g') then c.telefone
          else trim(c.telefone) || ' | ' || v_tel
        end,
        produtos_habituais = case
          when v_prod is null then c.produtos_habituais
          when c.produtos_habituais is null or trim(c.produtos_habituais) = '' then v_prod
          when position(v_prod in c.produtos_habituais) > 0 then c.produtos_habituais
          else trim(c.produtos_habituais) || E'\n---\n' || v_prod
        end,
        observacoes = case
          when v_obs is null then c.observacoes
          when c.observacoes is null or trim(c.observacoes) = '' then v_obs
          when position(v_obs in c.observacoes) > 0 then c.observacoes
          else trim(c.observacoes) || E'\n---\n' || v_obs
        end,
        updated_at = now()
      where c.id = v_existing_id;
      n_ok := n_ok + 1;
    else
      begin
        insert into public.clientes (user_id, organization_id, assigned_user_id, nome, tipo, tax_id, document_enrichment, ativo,
          whatsapp, telefone, produtos_habituais, observacoes, cor, iniciais)
        values (uid, p_organization_id, uid, v_nome, v_tipo, v_tax,
          case when elem ? 'document_enrichment' and jsonb_typeof(elem->'document_enrichment') = 'object' then elem->'document_enrichment' else null end,
          case when elem ? 'ativo' and (elem->>'ativo') in ('true', 'false') then (elem->>'ativo')::boolean else true end,
          v_wa, v_tel, v_prod, v_obs, nullif(trim(elem->>'cor'), ''), nullif(trim(elem->>'iniciais'), ''));
        n_ok := n_ok + 1;
      exception when unique_violation then
        errs := errs || jsonb_build_array(jsonb_build_object('index', idx, 'msg', 'Documento duplicado (CPF/CNPJ ja existe).'));
      when others then
        errs := errs || jsonb_build_array(jsonb_build_object('index', idx, 'msg', SQLERRM));
      end;
    end if;

    idx := idx + 1;
  end loop;
  return jsonb_build_object('inserted', n_ok, 'errors', errs);
end;
$fn$;
