-- P1: Transactional outbox for future webhooks / automations (consume via worker).

create table if not exists public.outbox_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error text,
  attempts int not null default 0
);

comment on table public.outbox_events is
  'Durable outbox for async delivery; enqueue via enqueue_outbox_event; process_outbox_batch marks rows processed (extend with real dispatch later).';

create index if not exists outbox_events_pending_idx
  on public.outbox_events (created_at asc)
  where processed_at is null;

create unique index if not exists outbox_events_org_idempotency_uidx
  on public.outbox_events (organization_id, idempotency_key)
  where idempotency_key is not null;

alter table public.outbox_events enable row level security;

create policy "outbox_select_org_member" on public.outbox_events for select
  using (
    organization_id in (select public.current_user_organization_ids())
  );

create or replace function public.enqueue_outbox_event(
  p_organization_id uuid,
  p_event_type text,
  p_payload jsonb default '{}'::jsonb,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_key text;
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

  if p_event_type is null or length(trim(p_event_type)) = 0 then
    raise exception 'event_type required';
  end if;

  v_key := nullif(trim(p_idempotency_key), '');

  if v_key is not null then
    begin
      insert into public.outbox_events (organization_id, event_type, payload, idempotency_key)
      values (
        p_organization_id,
        trim(p_event_type),
        coalesce(p_payload, '{}'::jsonb),
        v_key
      )
      returning id into v_id;
    exception
      when unique_violation then
        select e.id into v_id
        from public.outbox_events e
        where e.organization_id = p_organization_id
          and e.idempotency_key = v_key;
    end;

    return v_id;
  end if;

  insert into public.outbox_events (organization_id, event_type, payload, idempotency_key)
  values (
    p_organization_id,
    trim(p_event_type),
    coalesce(p_payload, '{}'::jsonb),
    null
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.enqueue_outbox_event(uuid, text, jsonb, text) is
  'Enqueue outbox row for the caller org; optional idempotency_key dedupes per organization.';

revoke all on function public.enqueue_outbox_event(uuid, text, jsonb, text) from public;
grant execute on function public.enqueue_outbox_event(uuid, text, jsonb, text) to authenticated;

create or replace function public.process_outbox_batch(p_batch_size int default 25)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  n_ok int := 0;
begin
  if p_batch_size < 1 or p_batch_size > 500 then
    raise exception 'invalid batch size';
  end if;

  for r in
    select e.id
    from public.outbox_events e
    where e.processed_at is null
    order by e.created_at asc
    limit p_batch_size
    for update skip locked
  loop
    update public.outbox_events
    set
      processed_at = now(),
      attempts = attempts + 1,
      last_error = null
    where id = r.id;

    n_ok := n_ok + 1;
  end loop;

  return jsonb_build_object('processed', n_ok);
end;
$$;

comment on function public.process_outbox_batch(int) is
  'Marks pending outbox rows as processed (placeholder worker); callable only with service_role. Extend with Slack/WhatsApp dispatch before update.';

revoke all on function public.process_outbox_batch(int) from public;
grant execute on function public.process_outbox_batch(int) to service_role;
