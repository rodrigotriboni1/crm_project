-- P1: Concurrency-safe display_num per organization (advisory lock + counter row).

create table if not exists public.organization_orcamento_display_seq (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  last_value integer not null
);

comment on table public.organization_orcamento_display_seq is
  'Next-1 display_num allocated for orcamentos per organization (updated under advisory xact lock).';

alter table public.organization_orcamento_display_seq enable row level security;

-- No policies: only SECURITY DEFINER trigger touches this table.

insert into public.organization_orcamento_display_seq (organization_id, last_value)
select o.organization_id, max(o.display_num)::integer
from public.orcamentos o
group by o.organization_id
on conflict (organization_id) do update
set last_value = greatest(
  public.organization_orcamento_display_seq.last_value,
  excluded.last_value
);

create or replace function public.orcamentos_set_display_num()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next int;
  v_from_table int;
begin
  if new.display_num is not null then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext(new.organization_id::text));

  select coalesce(max(o.display_num), 0) + 1
  into v_from_table
  from public.orcamentos o
  where o.organization_id = new.organization_id;

  insert into public.organization_orcamento_display_seq (organization_id, last_value)
  values (new.organization_id, v_from_table)
  on conflict (organization_id) do update
  set last_value = greatest(
    public.organization_orcamento_display_seq.last_value + 1,
    excluded.last_value
  )
  returning last_value into v_next;

  new.display_num := v_next;
  return new;
end;
$$;
