-- Número sequencial por usuário para referência curta do cartão (ex.: 00000001)
alter table public.orcamentos
  add column if not exists display_num integer;

with ranked as (
  select id, row_number() over (partition by user_id order by created_at asc, id asc) as rn
  from public.orcamentos
)
update public.orcamentos o
set display_num = ranked.rn
from ranked
where o.id = ranked.id
  and (o.display_num is null);

alter table public.orcamentos
  alter column display_num set not null;

create unique index if not exists orcamentos_user_display_num_uidx
  on public.orcamentos (user_id, display_num);

create or replace function public.orcamentos_set_display_num()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.display_num is null then
    select coalesce(max(display_num), 0) + 1 into new.display_num
    from public.orcamentos
    where user_id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists orcamentos_set_display_num_trigger on public.orcamentos;
create trigger orcamentos_set_display_num_trigger
  before insert on public.orcamentos
  for each row
  execute function public.orcamentos_set_display_num();

comment on column public.orcamentos.display_num is 'Sequencial por usuário para exibição/pesquisa (ex.: 00000001).';
