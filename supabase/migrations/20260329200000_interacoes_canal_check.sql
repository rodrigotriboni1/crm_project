-- Canais de interação: valores canónicos (inclui Sistema para logs da RPC)

update public.interacoes
set canal = 'WhatsApp'
where canal is null or trim(canal) = '';

update public.interacoes
set canal = 'WhatsApp'
where lower(trim(canal)) in ('whatsapp', 'outro', 'e-mail', 'email', 'outros');

update public.interacoes
set canal = 'Telefone'
where lower(trim(canal)) in ('telefone', 'phone', 'ligação', 'ligacao');

update public.interacoes
set canal = 'Presencial'
where lower(trim(canal)) in ('presencial', 'visita');

-- Qualquer valor restante fora do conjunto → WhatsApp (fallback seguro para relatórios)
update public.interacoes
set canal = 'WhatsApp'
where canal not in ('WhatsApp', 'Telefone', 'Presencial', 'Sistema');

alter table public.interacoes drop constraint if exists interacoes_canal_check;

alter table public.interacoes
  add constraint interacoes_canal_check
  check (canal in ('WhatsApp', 'Telefone', 'Presencial', 'Sistema'));

comment on column public.interacoes.canal is 'Canal: WhatsApp, Telefone, Presencial (utilizador) ou Sistema (automático).';
