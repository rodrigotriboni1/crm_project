create or replace function public.clientes_kpis_summary(p_organization_id uuid)
returns jsonb language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'ativos', count(*) filter (where c.ativo),
    'arquivados', count(*) filter (where not c.ativo),
    'recompras', count(*) filter (where c.ativo and c.tipo = 'recompra'),
    'com_telefone', count(*) filter (where c.ativo and (
      length(regexp_replace(coalesce(c.whatsapp, ''), '[^0-9]', '', 'g')) >= 8
      or length(regexp_replace(coalesce(c.telefone, ''), '[^0-9]', '', 'g')) >= 8)),
    'sem_contato_30', count(*) filter (where c.ativo and not exists (
      select 1 from public.interacoes i where i.cliente_id = c.id and i.organization_id = c.organization_id
        and i.data_contato >= (now() - interval '30 days'))))
  from public.clientes c
  where c.organization_id = p_organization_id
    and exists (select 1 from public.organization_members m where m.organization_id = p_organization_id and m.user_id = (select auth.uid()))
    and public.user_can_access_cliente_row(c.organization_id, c.user_id, c.assigned_user_id);
$$;
create or replace function public.import_clientes_batch(p_organization_id uuid, p_rows jsonb)
returns jsonb language plpgsql security invoker set search_path = public as $fn$
declare elem jsonb; idx int := 0; n_ok int := 0; errs jsonb := '[]'::jsonb; uid uuid := auth.uid(); v_tipo text;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.organization_members m where m.organization_id = p_organization_id and m.user_id = uid) then
    raise exception 'forbidden';
  end if;
  for elem in select jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    begin
      v_tipo := lower(trim(coalesce(elem->>'tipo', 'novo')));
      if v_tipo not in ('novo', 'recompra') then v_tipo := 'novo'; end if;
      insert into public.clientes (user_id, organization_id, assigned_user_id, nome, tipo, tax_id, document_enrichment, ativo,
        whatsapp, telefone, produtos_habituais, observacoes, cor, iniciais)
      values (uid, p_organization_id, uid, trim(elem->>'nome'), v_tipo, nullif(trim(elem->>'tax_id'), ''),
        case when elem ? 'document_enrichment' and jsonb_typeof(elem->'document_enrichment') = 'object' then elem->'document_enrichment' else null end,
        case when elem ? 'ativo' and (elem->>'ativo') in ('true', 'false') then (elem->>'ativo')::boolean else true end,
        nullif(trim(elem->>'whatsapp'), ''), nullif(trim(elem->>'telefone'), ''), nullif(trim(elem->>'produtos_habituais'), ''),
        nullif(trim(elem->>'observacoes'), ''), nullif(trim(elem->>'cor'), ''), nullif(trim(elem->>'iniciais'), ''));
      n_ok := n_ok + 1;
    exception when unique_violation then
      errs := errs || jsonb_build_array(jsonb_build_object('index', idx, 'msg', 'Documento duplicado (CPF/CNPJ ja existe).'));
    when others then
      errs := errs || jsonb_build_array(jsonb_build_object('index', idx, 'msg', SQLERRM));
    end;
    idx := idx + 1;
  end loop;
  return jsonb_build_object('inserted', n_ok, 'errors', errs);
end;
$fn$;
