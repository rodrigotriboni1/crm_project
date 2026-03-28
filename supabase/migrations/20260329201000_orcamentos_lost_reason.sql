-- Motivo de perda em orçamentos fechados como perdido; RPC alinhada

alter table public.orcamentos
  add column if not exists lost_reason text;

comment on column public.orcamentos.lost_reason is 'Motivo comercial quando status = perdido; default aplicado na RPC se vazio.';

drop function if exists public.apply_orcamento_update(uuid, text, date, text);

create or replace function public.apply_orcamento_update(
  p_orcamento_id uuid,
  p_status text,
  p_follow_up date,
  p_note text default null,
  p_lost_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old text;
  v_old_fu date;
  v_old_lost text;
  v_new_lost text;
  v_user uuid;
  v_cliente uuid;
  v_msg text;
  v_log boolean;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select o.status, o.follow_up_at, o.lost_reason, o.user_id, o.cliente_id
  into v_old, v_old_fu, v_old_lost, v_user, v_cliente
  from public.orcamentos o
  where o.id = p_orcamento_id
  for update;

  if not found then
    raise exception 'orçamento não encontrado';
  end if;

  if v_user <> auth.uid() then
    raise exception 'forbidden';
  end if;

  if p_status not in ('novo_contato', 'orcamento_enviado', 'dormindo', 'ganho', 'perdido') then
    raise exception 'status inválido';
  end if;

  if p_status = 'dormindo' and p_follow_up is null then
    raise exception 'Dormindo exige data de follow-up';
  end if;

  v_new_lost := case
    when p_status = 'perdido' then
      coalesce(
        nullif(trim(p_lost_reason), ''),
        nullif(trim(v_old_lost), ''),
        'Não informado'
      )
    else null
  end;

  v_log := (v_old is distinct from p_status)
    or (v_old_fu is distinct from p_follow_up)
    or (v_old_lost is distinct from v_new_lost)
    or (p_note is not null and length(trim(p_note)) > 0);

  update public.orcamentos
  set
    status = p_status,
    follow_up_at = p_follow_up,
    lost_reason = v_new_lost,
    updated_at = now()
  where id = p_orcamento_id;

  if v_log then
    v_msg := '';
    if v_old is distinct from p_status then
      v_msg := format('Status do orçamento: %s → %s', v_old, p_status);
      if p_status = 'perdido' then
        v_msg := v_msg || format('. Motivo: %s', v_new_lost);
      end if;
    end if;
    if v_old_fu is distinct from p_follow_up then
      if length(v_msg) > 0 then v_msg := v_msg || '. '; end if;
      if p_follow_up is null then
        v_msg := v_msg || 'Follow-up removido';
      else
        v_msg := v_msg || 'Follow-up: ' || to_char(p_follow_up, 'YYYY-MM-DD');
      end if;
    end if;
    if v_old_lost is distinct from v_new_lost and p_status = 'perdido' and v_old is not distinct from p_status then
      if length(v_msg) > 0 then v_msg := v_msg || '. '; end if;
      v_msg := v_msg || format('Motivo de perda: %s', v_new_lost);
    end if;
    if p_note is not null and length(trim(p_note)) > 0 then
      if length(v_msg) > 0 then v_msg := v_msg || '. '; end if;
      v_msg := v_msg || trim(p_note);
    end if;
    if length(trim(v_msg)) = 0 then
      v_msg := 'Orçamento atualizado';
    end if;

    insert into public.interacoes (user_id, cliente_id, orcamento_id, canal, anotacao, data_contato)
    values (
      auth.uid(),
      v_cliente,
      p_orcamento_id,
      'Sistema',
      v_msg,
      now()
    );
  end if;
end;
$$;

grant execute on function public.apply_orcamento_update(uuid, text, date, text, text) to authenticated;
