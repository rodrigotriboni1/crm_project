-- P1: Server-side report aggregation (bounded interval + row cap).

create or replace function public.reports_data_for_organization_range(
  p_organization_id uuid,
  p_start date,
  p_end date
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_span int;
  v_cnt bigint;
  v_max constant int := 20000;
  v_resumo_limit constant int := 1000;
  ts_start timestamptz;
  ts_end timestamptz;
  v_total int;
  v_valor_aberto numeric := 0;
  v_valor_ganho numeric := 0;
  v_por_status jsonb := '{}'::jsonb;
  v_serie jsonb := '[]'::jsonb;
  v_top jsonb := '[]'::jsonb;
  v_resumo jsonb := '[]'::jsonb;
  v_interacoes jsonb := '[]'::jsonb;
  v_trunc bool := false;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id and m.user_id = auth.uid()
  ) then
    raise exception 'forbidden';
  end if;

  if p_end < p_start then
    raise exception 'invalid_range';
  end if;

  v_span := (p_end - p_start);
  if v_span > 366 then
    raise exception 'interval_too_large';
  end if;

  select count(*) into v_cnt
  from public.orcamentos o
  where o.organization_id = p_organization_id
    and o.data_orcamento >= p_start
    and o.data_orcamento <= p_end;

  if v_cnt > v_max then
    raise exception 'too_many_orcamentos';
  end if;

  v_total := v_cnt::int;

  ts_start := (p_start::timestamp at time zone 'UTC');
  ts_end := (p_end::timestamp + interval '1 day' - interval '1 microsecond') at time zone 'UTC';

  select coalesce(sum(o.valor) filter (where o.status in ('novo_contato', 'orcamento_enviado')), 0),
         coalesce(sum(o.valor) filter (where o.status = 'ganho'), 0)
  into v_valor_aberto, v_valor_ganho
  from public.orcamentos o
  where o.organization_id = p_organization_id
    and o.data_orcamento >= p_start
    and o.data_orcamento <= p_end;

  select coalesce(
    jsonb_object_agg(
      s.status,
      jsonb_build_object('count', s.cnt, 'valorSum', s.valor_sum)
    ),
    '{}'::jsonb
  )
  into v_por_status
  from (
    select o.status::text as status, count(*)::int as cnt, coalesce(sum(o.valor), 0)::numeric as valor_sum
    from public.orcamentos o
    where o.organization_id = p_organization_id
      and o.data_orcamento >= p_start
      and o.data_orcamento <= p_end
    group by o.status
  ) s;

  select coalesce(
    jsonb_agg(jsonb_build_object('date', d.dt, 'count', d.cnt) order by d.dt),
    '[]'::jsonb
  )
  into v_serie
  from (
    select o.data_orcamento::text as dt, count(*)::int as cnt
    from public.orcamentos o
    where o.organization_id = p_organization_id
      and o.data_orcamento >= p_start
      and o.data_orcamento <= p_end
    group by o.data_orcamento
  ) d;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'clienteId', t.cliente_id,
        'clienteNome', t.cliente_nome,
        'orcamentosCount', t.cnt,
        'valorTotal', t.valor_total
      ) order by t.valor_total desc
    ),
    '[]'::jsonb
  )
  into v_top
  from (
    select
      o.cliente_id,
      max(c.nome) as cliente_nome,
      count(*)::int as cnt,
      coalesce(sum(o.valor), 0)::numeric as valor_total
    from public.orcamentos o
    inner join public.clientes c on c.id = o.cliente_id and c.organization_id = o.organization_id
    where o.organization_id = p_organization_id
      and o.data_orcamento >= p_start
      and o.data_orcamento <= p_end
    group by o.cliente_id
    order by sum(o.valor) desc
    limit 10
  ) t;

  if v_cnt > v_resumo_limit then
    v_trunc := true;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', x.id,
        'display_num', x.display_num,
        'clienteNome', x.cliente_nome,
        'status', x.status,
        'valor', x.valor::double precision,
        'data_orcamento', x.data_orcamento
      ) order by x.data_orcamento, x.id
    ),
    '[]'::jsonb
  )
  into v_resumo
  from (
    select o.id, o.display_num, c.nome as cliente_nome, o.status::text as status, o.valor,
           o.data_orcamento::text as data_orcamento
    from public.orcamentos o
    inner join public.clientes c on c.id = o.cliente_id and c.organization_id = o.organization_id
    where o.organization_id = p_organization_id
      and o.data_orcamento >= p_start
      and o.data_orcamento <= p_end
    order by o.data_orcamento asc, o.id asc
    limit v_resumo_limit
  ) x;

  select coalesce(
    jsonb_agg(jsonb_build_object('canal', y.canal, 'count', y.cnt) order by y.cnt desc),
    '[]'::jsonb
  )
  into v_interacoes
  from (
    select i.canal::text as canal, count(*)::int as cnt
    from public.interacoes i
    where i.organization_id = p_organization_id
      and i.data_contato >= ts_start
      and i.data_contato <= ts_end
    group by i.canal
  ) y;

  return jsonb_build_object(
    'totalOrcamentosNoPeriodo', v_total,
    'valorEmAbertoNoPeriodo', v_valor_aberto::double precision,
    'valorGanhoNoPeriodo', v_valor_ganho::double precision,
    'porStatus', v_por_status,
    'seriePorDia', v_serie,
    'topClientes', v_top,
    'interacoesPorCanal', v_interacoes,
    'orcamentosResumo', v_resumo,
    'orcamentosResumoTruncated', v_trunc
  );
end;
$$;

comment on function public.reports_data_for_organization_range(uuid, date, date) is
  'Aggregated reports JSON for org member; max 366-day span and 20000 orçamentos; resumo capped at 1000 rows.';

revoke all on function public.reports_data_for_organization_range(uuid, date, date) from public;
grant execute on function public.reports_data_for_organization_range(uuid, date, date) to authenticated;
