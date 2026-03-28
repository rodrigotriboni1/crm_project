-- MVP Embalagens: funil nos orçamentos, tipo cliente Novo/Recompra, follow-up por orçamento, RPC de atualização com log

-- 1) Interações: vínculo opcional ao orçamento
alter table public.interacoes
  add column if not exists orcamento_id uuid references public.orcamentos (id) on delete set null;

create index if not exists interacoes_orcamento_id_idx on public.interacoes (orcamento_id);

-- 2) Orçamentos: data do orçamento + follow-up; migrar status legado
alter table public.orcamentos
  add column if not exists data_orcamento date,
  add column if not exists follow_up_at date;

update public.orcamentos
set data_orcamento = coalesce(data_orcamento, (created_at at time zone 'utc')::date)
where data_orcamento is null;

alter table public.orcamentos
  alter column data_orcamento set default (current_date),
  alter column data_orcamento set not null;

update public.orcamentos set status = 'novo_contato' where status = 'em_aberto';
update public.orcamentos set status = 'orcamento_enviado' where status = 'negociacao';

alter table public.orcamentos drop constraint if exists orcamentos_status_check;

alter table public.orcamentos
  add constraint orcamentos_status_check
  check (status in ('novo_contato', 'orcamento_enviado', 'dormindo', 'ganho', 'perdido'));

alter table public.orcamentos
  add constraint orcamentos_dormindo_follow_up_check
  check (status <> 'dormindo' or follow_up_at is not null);

-- 3) Clientes: remover status/follow_up do cliente; tipo = novo | recompra
update public.clientes
set tipo = case
  when lower(trim(coalesce(tipo, ''))) in ('recompra', 'r') then 'recompra'
  else 'novo'
end;

alter table public.clientes drop constraint if exists clientes_status_check;

alter table public.clientes
  drop column if exists status,
  drop column if exists follow_up_at;

alter table public.clientes
  alter column tipo set default 'novo',
  alter column tipo set not null;

alter table public.clientes
  add constraint clientes_tipo_check check (tipo in ('novo', 'recompra'));

drop index if exists clientes_follow_up_idx;

-- 4) Canal: valores MVP (mantém dados antigos até normalizar)
update public.interacoes set canal = 'WhatsApp' where lower(canal) in ('whatsapp', 'outro', 'e-mail', 'email');
update public.interacoes set canal = 'Telefone' where lower(canal) = 'telefone';
update public.interacoes set canal = 'Presencial' where lower(canal) = 'presencial';

-- 5) RPC: atualizar orçamento + uma interação (status + nota opcional)
create or replace function public.apply_orcamento_update(
  p_orcamento_id uuid,
  p_status text,
  p_follow_up date,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old text;
  v_old_fu date;
  v_user uuid;
  v_cliente uuid;
  v_msg text;
  v_log boolean;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select o.status, o.follow_up_at, o.user_id, o.cliente_id
  into v_old, v_old_fu, v_user, v_cliente
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

  v_log := (v_old is distinct from p_status)
    or (v_old_fu is distinct from p_follow_up)
    or (p_note is not null and length(trim(p_note)) > 0);

  update public.orcamentos
  set
    status = p_status,
    follow_up_at = p_follow_up,
    updated_at = now()
  where id = p_orcamento_id;

  if v_log then
    v_msg := '';
    if v_old is distinct from p_status then
      v_msg := format('Status do orçamento: %s → %s', v_old, p_status);
    end if;
    if v_old_fu is distinct from p_follow_up then
      if length(v_msg) > 0 then v_msg := v_msg || '. '; end if;
      if p_follow_up is null then
        v_msg := v_msg || 'Follow-up removido';
      else
        v_msg := v_msg || 'Follow-up: ' || to_char(p_follow_up, 'YYYY-MM-DD');
      end if;
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

grant execute on function public.apply_orcamento_update(uuid, text, date, text) to authenticated;
