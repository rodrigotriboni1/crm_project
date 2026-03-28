-- Conversas separadas (threads) para o assistente do dashboard

create table if not exists public.assistant_chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Nova conversa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assistant_chat_threads_user_updated_idx
  on public.assistant_chat_threads (user_id, updated_at desc);

alter table public.assistant_chat_threads enable row level security;

create policy "assistant_threads_select_own"
  on public.assistant_chat_threads for select
  using (auth.uid() = user_id);

create policy "assistant_threads_insert_own"
  on public.assistant_chat_threads for insert
  with check (auth.uid() = user_id);

create policy "assistant_threads_update_own"
  on public.assistant_chat_threads for update
  using (auth.uid() = user_id);

create policy "assistant_threads_delete_own"
  on public.assistant_chat_threads for delete
  using (auth.uid() = user_id);

-- Mensagens passam a pertencer a uma thread
alter table public.assistant_chat_messages
  add column if not exists thread_id uuid references public.assistant_chat_threads (id) on delete cascade;

-- Uma thread por utilizador que já tinha mensagens (migração)
insert into public.assistant_chat_threads (user_id, title)
select distinct m.user_id, 'Conversas anteriores'
from public.assistant_chat_messages m
where not exists (
  select 1 from public.assistant_chat_threads t where t.user_id = m.user_id
);

update public.assistant_chat_messages msg
set thread_id = (
  select t.id
  from public.assistant_chat_threads t
  where t.user_id = msg.user_id
  order by t.created_at asc
  limit 1
)
where msg.thread_id is null;

alter table public.assistant_chat_messages
  alter column thread_id set not null;

drop policy if exists "assistant_chat_select_own" on public.assistant_chat_messages;
drop policy if exists "assistant_chat_insert_own" on public.assistant_chat_messages;
drop policy if exists "assistant_chat_delete_own" on public.assistant_chat_messages;

alter table public.assistant_chat_messages drop column if exists user_id;

create policy "assistant_chat_messages_select"
  on public.assistant_chat_messages for select
  using (
    exists (
      select 1 from public.assistant_chat_threads t
      where t.id = thread_id and t.user_id = auth.uid()
    )
  );

create policy "assistant_chat_messages_insert"
  on public.assistant_chat_messages for insert
  with check (
    exists (
      select 1 from public.assistant_chat_threads t
      where t.id = thread_id and t.user_id = auth.uid()
    )
  );

create policy "assistant_chat_messages_delete"
  on public.assistant_chat_messages for delete
  using (
    exists (
      select 1 from public.assistant_chat_threads t
      where t.id = thread_id and t.user_id = auth.uid()
    )
  );

drop index if exists assistant_chat_messages_user_created_idx;

create index if not exists assistant_chat_messages_thread_created_idx
  on public.assistant_chat_messages (thread_id, created_at asc);

create or replace function public.bump_assistant_thread_on_message()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.assistant_chat_threads
  set updated_at = now()
  where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists assistant_chat_messages_bump_thread on public.assistant_chat_messages;
create trigger assistant_chat_messages_bump_thread
  after insert on public.assistant_chat_messages
  for each row execute function public.bump_assistant_thread_on_message();

comment on table public.assistant_chat_threads is 'Conversas do assistente IA (várias por utilizador).';
