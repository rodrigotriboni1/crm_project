# Consola admin EmbalaFlow

Aplicação **interna** para criar empresas (`organizations`), convites e estado da conta. Usa o **mesmo projeto Supabase** que o CRM; o acesso é restrito à tabela `platform_admins` (RPCs `admin_*` / `platform_*`).

## Pré-requisitos na base de dados

1. Migrações aplicadas (incl. `platform_admins`, colunas em `organizations`, etc.).
2. Promover utilizadores que podem usar esta consola:

```sql
insert into public.platform_admins (user_id) values ('<uuid de auth.users>');
```

Ver também [`../supabase/seed_platform_admin.example.sql`](../supabase/seed_platform_admin.example.sql).

## Desenvolvimento local

```bash
cd admin
cp .env.example .env
# Preencher VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_CRM_PUBLIC_URL
npm install
npm run dev
```

Por defeito o Vite serve em **http://localhost:5174** (o CRM costuma ser 5173).

### Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `VITE_SUPABASE_URL` | URL do projeto (ex. `https://xxxx.supabase.co`). |
| `VITE_SUPABASE_ANON_KEY` | Chave **anon** publicável (Dashboard → Project Settings → API). |
| `VITE_CRM_PUBLIC_URL` | URL **pública** do CRM onde os utilizadores abrem `/join?token=...`. Em dev: `http://localhost:5173`. Em produção: o domínio do CRM (ex. `https://crm.embalflow.pt`). **Sem** barra final. |

Não uses `service_role` nesta app: o browser só precisa da anon key; as RPCs validam `platform_admins` no Postgres.

## Deploy na Vercel (projeto separado do CRM)

O CRM na raiz do repo já tem o seu `vercel.json`. A consola admin deve ser **outro projeto Vercel** (outro domínio, outro pipeline).

### 1. Criar projeto

1. [Vercel](https://vercel.com) → Add New → Project → importar o **mesmo** repositório Git.
2. Em **Root Directory**, definir **`admin`** (importante: o build corre a partir desta pasta).
3. Framework: Vite (detetado automaticamente se existir `admin/vercel.json`).
4. Adicionar as variáveis de ambiente (Production e opcionalmente Preview):

   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_CRM_PUBLIC_URL` → URL de produção do CRM (ex. `https://app.embalflow.pt`)

5. Deploy.

### 2. Domínio personalizado (ex. `admin.embalflow.pt`)

1. No projeto Vercel da **consola admin** → **Settings** → **Domains** → adicionar `admin.embalflow.pt` (ou o subdomínio que quiseres).
2. Na **Zona DNS** do domínio (Cloudflare, registo, etc.), criar o registo que a Vercel indicar, por exemplo:
   - **CNAME** `admin` → `cname.vercel-dns.com` (ou o alvo exacto mostrado no painel), **ou**
   - os registos **A** que a Vercel mostrar para o apex, se usares o domínio raiz.
3. Esperar propagação (minutos a horas). A Vercel emite certificado TLS automaticamente.

Garante que `VITE_CRM_PUBLIC_URL` em produção aponta para o URL **real** do CRM (HTTPS), para os links de convite gerados na consola estarem correctos.

## Segurança

- Apenas contas em `platform_admins` vêem dados úteis; outras recebem “Sem acesso”.
- Rotaciona a anon key apenas se necessário; a política de acesso está nas RPCs e RLS.
- Para auditoria, rever periodicamente `select * from public.platform_admins`.

## Resolução de problemas

| Sintoma | Verificar |
|---------|-----------|
| “Sem acesso” após login | `user_id` em `platform_admins` corresponde ao utilizador Auth. |
| Links `/join` incorrectos | `VITE_CRM_PUBLIC_URL` igual ao URL público do CRM (protocolo + host, sem `/` final). |
| RPC falha 403 / erro | Migrações aplicadas; utilizador autenticado. |
| Build falha na Vercel | Root Directory = `admin`; `package.json` com script `build`. |

## Referências no repositório

- Migração: [`../supabase/migrations/20260406140000_platform_admin_billing.sql`](../supabase/migrations/20260406140000_platform_admin_billing.sql)
- Contexto geral: [`../AGENTS.md`](../AGENTS.md)
