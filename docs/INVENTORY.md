# CRM EmbalaFlow — screen & entity inventory

Source: reverse-engineered from [`crm-embalagens-react.html`](../crm-embalagens-react.html) (minified bundle): JSX `children:"…"` strings and object keys (`clienteId`, `nome`, `whatsapp`, etc.).

## Product

- **Name (UI):** EmbalaFlow  
- **Domain:** CRM for **embalagens** (packaging) — clients, quotes (“orçamentos”), and contact history.

## Screens & user actions

| Area | Actions |
|------|--------|
| **Dashboard** | View KPIs: total clientes, “+N este mês”, follow-ups vencidos/próximos, “R$ … em jogo” (pipeline value), últimas interações. |
| **Clientes** | List / search (“Nome / Empresa”), empty state “Nenhum cliente encontrado.”, **Novo cliente**, **Salvar cliente**, fields: Nome, Tipo, WhatsApp, Telefone, Produtos habituais, Observações, follow-up date (“Data de follow-up”), visual identity (iniciais / cor). |
| **Orçamentos** | List, “Nenhum orçamento cadastrado/encontrado”, **Novo orçamento**, **Salvar orçamento**, Produto/descrição, Valor (R$), link to cliente, status workflow (“Status inicial”, **Mover para…**). |
| **Histórico / interações** | Per client: “Histórico de contatos”, “Últimas interações”, **Registrar contato** / **Registrar**, Anotação, Canal (e.g. Presencial, WhatsApp), Data; empty “Nenhuma interação registrada.” |

## Entities (persistence)

1. **Cliente** — `nome` (nome/empresa), `tipo`, `whatsapp`, `telefone`, `produtos_habituais`, `observacoes`, `follow_up_at`, `status` (e.g. ativo, aguardando follow-up, dormindo), optional `cor` / `iniciais` (can be derived in UI).
2. **Orçamento** — belongs to `cliente`; `produto_descricao`, `valor` (BRL), `status` (pipeline).
3. **Interação** — belongs to `cliente`; `canal`, `anotacao`, `data_contato`.

## Auth & tenancy

- **Supabase Auth** — each row scoped by `user_id = auth.uid()` (single-user CRM per account; can later add `org_id` for teams).
