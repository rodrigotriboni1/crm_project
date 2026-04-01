-- INSERT em clientes: alinhar à mesma regra de mutação que UPDATE/DELETE.
-- A política anterior exigia sempre user_id e assigned_user_id = auth.uid(),
-- o que bloqueava casos válidos (ex.: owner / membro com data_scope organization)
-- e ficou inconsistente com user_can_mutate_cliente_row nos updates.

drop policy if exists "clientes_insert_org" on public.clientes;

create policy "clientes_insert_org" on public.clientes for insert with check (
  organization_id in (select public.current_user_organization_ids())
  and public.user_can_mutate_cliente_row(organization_id, user_id, assigned_user_id)
);
