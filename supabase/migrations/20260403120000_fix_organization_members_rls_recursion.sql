-- Evita 42P17: a política anterior fazia subconsulta em organization_members
-- sobre a própria tabela organization_members (recursão infinita no RLS).

drop policy if exists "organization_members_select" on public.organization_members;

-- Cada utilizador vê apenas as suas linhas de membro; basta para o client
-- (.eq('user_id', …)) e para subconsultas nas outras políticas (org ∈ membros do user).
create policy "organization_members_select_own"
  on public.organization_members for select
  using (user_id = (select auth.uid()));
