# EmbalaFlow CRM — contexto para agentes

Documento vivo do **repositório `crm-embalagens`**: stack e o que já existe. Para documentação genérica do Cursor (worktrees, subagentes, cloud agents), ver [cursor.com/docs/agent/overview](https://cursor.com/docs/agent/overview).

**Backend:** permanece **Supabase** (Postgres + Auth + Edge Functions).

---

## Produto e repositório

- **Nome:** EmbalaFlow CRM (embalagens / vendas B2B).
- **Layout:** **`client/`** (Vite + React + TypeScript + Tailwind 4), **`supabase/`** (migrations SQL + Edge Functions Deno). A **consola admin** vive em [`admin/`](admin/) como **submodule** Git ([`embalflow-admin`](https://github.com/rodrigotriboni1/embalflow-admin)), com deploy Vercel próprio; migrações e backend continuam neste repo. Após `git clone`, usar `git submodule update --init --recursive` (ou clonar com `git clone --recurse-submodules`).
- **Deploy frontend:** Vercel (`vercel.json` aponta build para `client/dist`).
- **Legado:** `crm-embalagens-react.html` / `index.html` na raiz (protótipo); app principal é o **client**.

---

## O que já está implementado (alto nível)

### Frontend (`client/src`)

- **Auth:** login, callback OAuth/magic link (`/auth/callback`), fluxo quando Supabase não está configurado (`SetupPage`).
- **Áreas principais:** Dashboard, Kanban (filtros avançados, **filtros salvos**, agrupamentos), Clientes (lista + detalhe), **planilha** (`/clientes/planilha` com Glide Data Grid), Orçamentos, Produtos, Relatórios, Equipe/organização.
- **Multi-tenant / equipe:** contexto de organização, página de join (`/join`), membros, convites (UI + backend).
- **Assistente:** painéis de assistente (ex.: `CrmAssistantPanel`, relatórios/dashboard), integração com modelo via **OpenRouter** (chave no cliente em dev; em produção via Edge Function).
- **UX:** tema claro/escuro, navegação mobile (`MobileBottomNav`), componentes Radix/shadcn-style, Recharts.

### Backend: Supabase

- **Cliente:** `@supabase/supabase-js`, variáveis `VITE_SUPABASE_*` em `client/.env.example`.
- **Dados:** Postgres com RLS; evolução em muitas migrations sob `supabase/migrations/` (baseline remoto, organizações, equipe, importação em lote de clientes, outbox, relatórios agregados, RPCs, ajustes de RLS, Kanban filtros salvos, etc.).
- **Edge Functions** (Deno), entre outras:
  - `openrouter-chat` — chat/LLM com rate limit por organização e limites por plano (`get_organization_ai_chat_limits` + `consume_openrouter_chat_rate`).
  - `stripe-webhook` — assinaturas Stripe (metadata `organization_id` na subscrição aponta para uma **unidade**; a RPC resolve a `legal_entity` e actualiza `legal_entity_billing` + quotas na entidade). `verify_jwt = false` em `config.toml`.
  - `process-outbox` — processamento de eventos outbox.
  - `send-org-invite-email` — convites (ex.: Resend; secrets no Supabase).
- **Multi-tenant / billing:** `platform_admins`, `legal_entities` (plano, `seat_limit`, suspensão), `organizations` (unidades com `legal_entity_id`), `legal_entity_billing`; signup sem org por defeito (só convite); RPCs `admin_*` / `platform_*` (billing migrou em `20260430150000_legal_entities_matrizes.sql`).
- **Ferramentas:** CLI `supabase` no `package.json` da raiz para migrações/deploy local.

### Infra local / CI

- Docker (`Dockerfile`, `docker-compose.yml`) para cenários de desenvolvimento/container.
- `.github/` para automação (ver workflows no repo).

---

## Convenções úteis

- **UI EmbalaFlow:** regras em `.cursor/rules/embaflow-crm-ui.mdc`.
- **Variáveis:** nunca commitar `.env`; seguir `client/.env.example` e comentários das Edge Functions para secrets no servidor.

---

## Histórico recente (git — referência)

Commits recentes incluem melhorias no Kanban (filtros salvos, controlos), alinhamento de RLS em `clientes`, fluxo de e-mail de confirmação expirado, e merges de PRs de correções auth/DB. Atualizar esta secção quando houver marcos relevantes no Supabase ou no frontend.

---

## Learned User Preferences

- Preferir deploy e CI separados para o cliente CRM e para a consola admin, para que falhas num pipeline não bloqueiem o outro.

## Learned Workspace Facts

- O repositório `embalflow-admin` pode existir como clone standalone (por exemplo em `Documents/embalflow-admin`) e também como submodule Git em `admin/` dentro do CRM; o CRM fixa uma revisão concreta do submodule.
