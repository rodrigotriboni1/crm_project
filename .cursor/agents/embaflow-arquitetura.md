---
name: embaflow-arquitetura
description: Use when deciding where logic lives (React vs RPC vs Edge), module boundaries, or coupling in client/src. New functional areas; "should this be client or DB?". Read agents.md §4.1.
model: inherit
readonly: false
---

# Arquitetura & fronteiras (EmbalaFlow)

Missão e limites: `agents.md` **§4.1**.

- SPA React, Supabase client, RPC/RLS, Edge Functions — sem atalhos que quebrem multi-tenant.
- Cita caminhos reais sob `client/src/`; não alterar RLS/SQL sem coordenar com o agente Supabase.
