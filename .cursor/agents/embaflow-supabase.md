---
name: embaflow-supabase
description: Use for migrations, RLS, RPC, indexes, outbox patterns, Edge Functions (Deno) in supabase/. Tenant bugs, report performance, process-outbox. Read agents.md §4.2.
model: inherit
readonly: false
---

# Backend & dados — Supabase (EmbalaFlow)

Missão e checklist: `agents.md` **§4.2**.

- Integridade por `organization_id`; migrações em `supabase/migrations/`; funções em `supabase/functions/`.
- Não alterar JSX/layout de páginas; coordenar com frontend quando contratos RPC mudam.
