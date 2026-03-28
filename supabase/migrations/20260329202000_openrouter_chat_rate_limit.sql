-- Rate limit para Edge Function openrouter-chat (contagem por utilizador, janela fixa)

create table if not exists public.openrouter_chat_rate (
  user_id uuid not null primary key references auth.users (id) on delete cascade,
  window_started_at timestamptz not null default now(),
  requests int not null default 0
);

comment on table public.openrouter_chat_rate is 'Contadores de pedidos OpenRouter por utilizador; só acessível via RPC security definer.';

alter table public.openrouter_chat_rate enable row level security;

revoke all on table public.openrouter_chat_rate from authenticated, anon;

create or replace function public.consume_openrouter_chat_rate(p_max int, p_window_seconds int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.openrouter_chat_rate%rowtype;
  v_now timestamptz := clock_timestamp();
  v_elapsed double precision;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if p_max < 1 or p_window_seconds < 1 then
    raise exception 'invalid rate parameters';
  end if;

  select * into v_row from public.openrouter_chat_rate where user_id = v_uid for update;

  if not found then
    insert into public.openrouter_chat_rate (user_id, window_started_at, requests)
    values (v_uid, v_now, 1);
    return jsonb_build_object('allowed', true, 'remaining', p_max - 1);
  end if;

  v_elapsed := extract(epoch from (v_now - v_row.window_started_at));

  if v_elapsed >= p_window_seconds then
    update public.openrouter_chat_rate
    set window_started_at = v_now, requests = 1
    where user_id = v_uid;
    return jsonb_build_object('allowed', true, 'remaining', p_max - 1);
  end if;

  if v_row.requests >= p_max then
    return jsonb_build_object(
      'allowed', false,
      'retry_after_seconds', greatest(1, ceil(p_window_seconds - v_elapsed)::int)
    );
  end if;

  update public.openrouter_chat_rate set requests = requests + 1 where user_id = v_uid;
  return jsonb_build_object('allowed', true, 'remaining', p_max - v_row.requests - 1);
end;
$$;

grant execute on function public.consume_openrouter_chat_rate(int, int) to authenticated;

comment on function public.consume_openrouter_chat_rate is 'Incrementa contador na janela; retorna allowed e remaining ou retry_after_seconds.';
