# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

EmbalaFlow CRM — a multi-tenant CRM for the Brazilian packaging industry. React 18 + Vite frontend with a hosted Supabase backend (auth, Postgres, edge functions). All UI is in Brazilian Portuguese (pt-BR).

### Services

| Service | How to run | Notes |
|---------|-----------|-------|
| Frontend (Vite) | `npm run dev` (from root) or `cd client && npx vite --host 0.0.0.0` | Runs on port 5173. Connects to remote Supabase — no local DB needed. |

### Key commands

| Task | Command | Working directory |
|------|---------|-------------------|
| Install deps | `npm ci` | `/workspace` |
| Lint | `npm run lint --prefix client` | `/workspace` |
| Test | `npm test --prefix client` | `/workspace` |
| Build | `npm run build --prefix client` | `/workspace` |
| Dev server | `npm run dev` | `/workspace` |

### Environment

- **Node.js 22+** required (matches CI).
- `client/.env` must exist with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. See `client/.env.example` for the template.
- The Supabase project ID is `pjpcotvxeuqjznagiiyh` (region: `us-west-2`).
- Optional env vars: `VITE_OPENROUTER_API_KEY`, `VITE_OPENROUTER_MODEL`, `VITE_NOVO_ORCAMENTO_EXTERNAL_URL`.

### Gotchas

- ESLint produces ~17 warnings (no errors) — all pre-existing hook-dep and react-refresh warnings. These are expected.
- `npm run build` emits Rollup annotation warnings from `@glideapps/glide-data-grid` — harmless.
- Supabase email signup is rate-limited to 2 per hour. For testing, create users directly via SQL in the Supabase dashboard or MCP tool.
- When inserting auth users via SQL, all nullable text columns (`email_change`, `phone`, `phone_change`, etc.) must be set to `''` (empty string), not NULL, or GoTrue will fail with "converting NULL to string is unsupported".
- The `handle_new_user` trigger auto-creates a profile and organization on signup. When inserting users via SQL (bypassing the trigger), manually insert into `profiles`, `organizations`, and `organization_members`.
