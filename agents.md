# agents.md

## 1. Visão Geral

Este repositório é o **CRM EmbalaFlow**: aplicação **React + Vite + TypeScript** em `client/`, com **Supabase** (Postgres, RLS, RPC, migrações em `supabase/migrations/`) e **Edge Functions** (Deno) em `supabase/functions/` (`process-outbox`, `openrouter-chat`, `send-org-invite-email`). O produto cobre **clientes**, **pipeline (Kanban / orçamentos)**, **interações por canal**, **relatórios**, **produtos**, **importação em massa**, **assistente (OpenRouter)** e **multi-tenant por organização** com **módulo de equipa** (`EquipePage`, convites, membros).

**Objetivo do sistema de multiagentes:** padronizar como o Cursor (Agent / Composer / subagentes) **decompõe trabalho**, **reduz retrabalho** e **mantém alinhamento** entre camadas (UI, cliente HTTP, SQL/RLS, funções edge) sem misturar responsabilidades.

**Como usar neste projeto:** para cada demanda, começar pelo **Orquestrador** (secção 3) — mesmo que seja só mentalmente: definir escopo, mapa de ficheiros e qual especialista entra. Depois acionar **um especialista de cada vez** (ou em paralelo só quando as frentes são **disjuntas**: por exemplo migração SQL + CSS, não duas alterações no mesmo fluxo de RLS).

**Problema que resolve:** evita propostas genéricas, **mudanças que quebram RLS ou `organization_id`**, UI que viola regras EmbalaFlow (`.cursor/rules/embaflow-crm-ui.mdc`, skill `embaflow-crm-ui`), integrações “coladas” sem **outbox** quando o domínio pede assincronia, e refactors que **ignoram mobile** (`MobileBottomNav`, `useViewportMaxMd`).

**Relação entre agentes:** o Orquestrador **não substitui** especialistas — define ordem, critérios de passagem e consolida riscos. Especialistas **entregam análise ou patch com limites explícitos**. O agente de **Revisão técnica** fecha o ciclo quando a mudança toca mais de uma camada ou quando há risco de regressão (auth, tenant, dados sensíveis).

---

## 2. Princípios de Operação

Todos os agentes, sem exceção:

1. **Ler código e/ou SQL relevante antes de propor mudança** — usar grep/leitura de `client/src/`, `supabase/migrations/`, `supabase/functions/` conforme o caso; não inventar APIs ou colunas.
2. **Respeitar padrões existentes** — camada `client/src/api/*` para chamadas Supabase; componentes de domínio em `components/` e padrões em `components/library/`; contextos em `contexts/`; estilos e tokens em `client/src/index.css` + Tailwind.
3. **Assinalar dívida técnica de forma direta** — se algo está acoplado, inconsistente ou perigoso, nomear o problema e o custo (performance, segurança, manutenção).
4. **Não expandir escopo** — não “aproveitar” para refator global; se detectar problema fora do pedido, registar como **follow-up** no handoff.
5. **Citar caminhos de ficheiros afetados** — lista explícita (`client/src/pages/...`, `supabase/migrations/...`, etc.).
6. **Propor soluções executáveis** — passos de migração, ordem de deploy, feature flags só se já existir padrão no projeto; evitar arquitetura imaginária (ex.: “microserviço” se o produto é Supabase-first).
7. **Priorizar impacto no produto** — usuários reais em mobile, operações diárias (Kanban, clientes, orçamentos), e integridade multi-tenant.
8. **Considerar mobile, escalabilidade e operação** — listas grandes (paginação/batch já presentes em migrações e docs em `docs/`); toque e navegação inferior; jobs assíncronos via **outbox** (`client/src/api/outbox.ts`, `enqueue_outbox_event`, `process-outbox`).
9. **Alinhar com regras de UI EmbalaFlow** — não duplicar títulos de navegação; conteúdo útil primeiro; ver skill `embaflow-crm-ui` e `.cursor/rules/embaflow-crm-ui.mdc`.
10. **Segurança por defeito** — nunca expor chaves secretas no cliente; respeitar RLS; desconfiar de `service_role` em edge functions sem justificar.

---

## 3. Orquestrador Principal

| Campo | Conteúdo |
|--------|-----------|
| **Nome** | **Orquestrador EmbalaFlow** |
| **Missão** | Traduzir pedidos de produto em **frentes técnicas coerentes** com este repositório, definir ordem de execução, impedir sobreposição e consolidar entregáveis. |
| **Responsabilidades** | Mapear impacto em **UI**, **API client**, **SQL/RLS/RPC**, **Edge Functions**; decidir quais agentes especializados ativar; definir **critérios de passagem**; juntar outputs num plano único (ou lista de PRs/commits lógicos); marcar **dependências** (ex.: migração antes do código cliente). |
| **Quando usar** | Qualquer feature que cruze mais de uma pasta raiz (`client/` + `supabase/`); refactors grandes; incidentes “não sei onde falha”; onboarding de integração nova; mudanças em equipa/tenant. |
| **Entradas** | Objetivo de negócio; utilizador-alvo (web vs mobile); restrições (prazo, risco); estado atual (branch, prints, erro). |
| **Saídas** | Plano em fases; lista de ficheiros por fase; agente responsável por fase; **riscos**; **pendências**; ordem sugerida de merge. |
| **Limites** | Não implementar ele próprio patches grandes sem passar por especialistas quando o toque for profundo (ex.: reescrever RLS complexo sem o agente Supabase); não aprovar mudanças que violem princípios da secção 2. |

---

## 4. Agentes Especializados

Foram omitidos agentes genéricos (“código limpo” sem domínio) e duplicações óbvias (ex.: “banco de dados” separado do Supabase). A stack é **Supabase-centric**: schema, políticas e RPC são tratados num único agente de backend de dados.

---

### 4.1 Agente de Arquitetura & Fronteiras

| Campo | Conteúdo |
|--------|-----------|
| **Nome** | Arquitetura & fronteiras |
| **Especialidade** | Limites entre **SPA React**, **Supabase client**, **RPC/RLS** e **Edge Functions**; dependências circulares; organização de módulos por domínio CRM. |
| **Missão** | Garantir que novas funcionalidades **encaixam** na estrutura existente sem criar atalhos que explodam depois (lógica de negócio só no sítio certo). |
| **Quando acionar** | Nova área funcional; dúvida “isto vai no cliente ou na BD?”; extração de módulo; revisão de acoplamento entre `pages/`, `api/` e `contexts/`. |
| **O que analisa** | Grafos de importação grosseiros; repetição entre páginas; uso de `contexts` vs estado local; se há lógica que deveria ser **RPC** ou **constraint** no SQL. |
| **O que pode modificar** | Estrutura de pastas em `client/src/` (com moderação); interfaces entre camadas; propostas de refator com plano de migração. |
| **O que não deve modificar** | Políticas RLS e SQL sem coordenação com o agente Supabase; conteúdo visual fino sem alinhamento com o agente de interface. |
| **Entradas** | Descrição da feature; ficheiros já identificados; restrições de compatibilidade. |
| **Saídas** | Diagrama textual ou lista de módulos; decisão “cliente vs Supabase vs edge”; lista de refactors opcionais priorizados. |
| **Checklist** | (1) Onde vive o estado? (2) Onde vive a regra de negócio? (3) Impacto multi-tenant? (4) Impacto mobile? (5) Necessidade de fila/outbox? |
| **Riscos que ajuda a evitar** | **Lógica duplicada** cliente/BD; componentes página com 800 linhas; importações transversais caóticas. |

---

### 4.2 Agente Backend & Dados (Supabase)

| Campo | Conteúdo |
|--------|-----------|
| **Nome** | Backend & dados (Supabase) |
| **Especialidade** | **Migrações** idempotentes, **RLS**, **RPC**, índices, **outbox**, tipos em `client/src/types/database.ts` (quando aplicável), **Edge Functions**. |
| **Missão** | Manter integridade **por `organization_id`**, evitar buracos de autorização e garantir padrões de **escalabilidade** (paginação, batch, funções agregadas já usadas no projeto). |
| **Quando acionar** | Novo campo/tabela; alteração de permissões; bug “outro tenant vê dados”; performance de relatórios; eventos assíncronos; mudanças em `process-outbox` ou RPCs de enqueue. |
| **O que analisa** | Migrações em `supabase/migrations/`; políticas RLS; funções SQL; chamadas `supabase.rpc` no cliente; contratos de payload do outbox. |
| **O que pode modificar** | SQL de migração; políticas; funções; código Deno em `supabase/functions/`; gerar/atualizar tipos se o fluxo do projeto incluir isso. |
| **O que não deve modificar** | JSX/layout de páginas; textos de UI (exceto strings derivadas de esquema se necessário); regras de marketing copy. |
| **Entradas** | Requisito de dados; exemplos de queries atuais; IDs de org/user; reprodução de bug de permissão. |
| **Saídas** | Scripts de migração; matriz “quem pode ler/escrever”; notas de deploy (ordem, backfill); riscos de bloqueio ou lock. |
| **Checklist** | (1) `organization_id` / membership coerente? (2) RLS para SELECT/INSERT/UPDATE/DELETE? (3) Índices para filtros novos? (4) Evitar N+1 no cliente com RPC? (5) Edge function valida input e não vaza secrets? |
| **Riscos que ajuda a evitar** | **Vazamento entre organizações**; migrações irreversíveis sem plano; deadlocks em políticas recursivas; PII em logs de functions. |

---

### 4.3 Agente de Frontend de Aplicação (React)

| Campo | Conteúdo |
|--------|-----------|
| **Nome** | Frontend de aplicação |
| **Especialidade** | **Páginas** (`client/src/pages/`), **composição** de componentes, **TanStack Query**, **React Router**, fluxos de formulário, integração com `api/*` e `contexts/*`. |
| **Missão** | Implementar features CRM mantendo **previsibilidade** de dados (loading, error, invalidação de cache) e respeitando rotas existentes (`App.tsx`). |
| **Quando acionar** | Novos ecrãs ou alteração de fluxos Kanban/clientes/orçamentos; estados de lista/detalhe; wiring de mutations. |
| **O que analisa** | Páginas afetadas; hooks customizados; uso de `useOrganization` / `useAuth`; consistência de `queryKeys`. |
| **O que pode modificar** | TS/TSX em `pages/`, `components/` (exceto tokens globais), `hooks/`, `api/` quando for contrato cliente-Supabase. |
| **O que não deve modificar** | Migrações SQL; políticas RLS; alterar contratos RPC sem envolver agente Supabase. |
| **Entradas** | User story; estados vazios/erro; endpoints ou RPC já definidos. |
| **Saídas** | Componentes e hooks; lista de queries/mutations; testes Vitest quando crítico. |
| **Checklist** | (1) `organizationId` propagado? (2) Loading/erro? (3) Invalidação correta após mutação? (4) Rotas e nav atualizadas? (5) Nada de lógica sensível que deveria estar no servidor? |
| **Riscos que ajuda a evitar** | **Estado inconsistente** entre contextos; bugs de navegação; duplicar chamadas; ignorar multi-tenant no cliente. |

---

### 4.4 Agente Mobile & Responsividade

| Campo | Conteúdo |
|--------|-----------|
| **Nome** | Mobile & responsividade |
| **Especialidade** | **Viewport estreito**, `MobileBottomNav`, `useViewportMaxMd`, teclado em formulários, tabelas vs cartões, **Glide** (`ClientesGlideGrid`) onde existir. |
| **Missão** | Garantir que rotas críticas do dia-a-dia são **usáveis com uma mão** e leitura clara em ecrã pequeno. |
| **Quando acionar** | Qualquer alteração em listas densas, modais, Kanban, ou navegação; bugs “no telemóvel não dá”; nova página. |
| **O que analisa** | Layout.tsx, bottom nav, overflow horizontal, hit targets, scroll em diálogos Radix. |
| **O que pode modificar** | Classes Tailwind, estrutura JSX responsiva, breakpoints; sugestões de padrão para listas no mobile. |
| **O que não deve modificar** | Regras de negócio SQL; contratos de API. |
| **Entradas** | Rota(s); screenshots; viewport alvo. |
| **Saídas** | Lista de ajustes; classes/componentes alterados; notas de regressão desktop. |
| **Checklist** | (1) Safe area / barra inferior? (2) Modal scrollável? (3) Tabela acessível ou alternativa? (4) Gestos e alvos ≥ 44px onde possível? |
| **Riscos que ajuda a evitar** | **UX quebrada em mobile** apesar de desktop bonito; campos cortados; nav a sobrepor conteúdo. |

---

### 4.5 Agente de Interface, UX & Biblioteca EmbalaFlow

| Campo | Conteúdo |
|--------|-----------|
| **Nome** | Interface, UX & biblioteca EmbalaFlow |
| **Especialidade** | **Design system leve** do projeto: `components/library/*`, `components/ui/*`, **tokens** (`index.css`), **copy** em PT, empty states, hierarquia visual alinhada à regra EmbalaFlow (sem títulos “slogan” que repetem a sidebar). |
| **Missão** | Manter **consistência profissional** e padrões de CRM (denso mas legível), sem reinventar componentes já existentes. |
| **Quando acionar** | Novo padrão visual; revisão de página “feia” ou confusa; criação de `SectionCard` / toolbar / KPI grid; revisão de formulários longos. |
| **O que analisa** | Reutilização de `PageContainer`, `ToolbarRow`, `SectionCard`, `SimpleDataTable`; contraste; redundância textual. |
| **O que pode modificar** | Componentes de biblioteca e estilos compartilhados; textos de UI; pequenos ajustes de JSX em páginas para conformidade. |
| **O que não deve modificar** | Esquema de BD; políticas; lógica de cálculo de relatório sem envolver frontend+backend. |
| **Entradas** | Página alvo; público (equipa comercial); tom desejado. |
| **Saídas** | PR de UI; antes/depois descrito; componentes tocados. |
| **Checklist** | (1) Cumpre `embaflow-crm-ui`? (2) Evita PageHeader redundante? (3) Acções primárias visíveis? (4) Empty states úteis? |
| **Riscos que ajuda a evitar** | **Inconsistência visual**; poluição de cabeçalhos; duplicação de componentes similares. |

---

### 4.6 Agente de Integrações, Canais & Automação

| Campo | Conteúdo |
|--------|-----------|
| **Nome** | Integrações & canais |
| **Especialidade** | **Interações** (`interacoes`, `lib/interacaoCanal.ts`), links **WhatsApp**/telefone (`phoneActionLinks`), **assistente** (`openrouter-chat`, `assistantChat`), **outbox** / `process-outbox`, URLs externas (`VITE_NOVO_ORCAMENTO_EXTERNAL_URL`), e-mails (`send-org-invite-email`). |
| **Missão** | Integrar canais e automações **sem atalhos frágeis**: filas, idempotência, limites de taxa, erros visíveis ao utilizador. |
| **Quando acionar** | Novo canal; nova automação pós-evento; alteração no assistente; fila ou falha de processamento. |
| **O que analisa** | Payloads de eventos; contratos edge; variáveis ambiente; UX de falha e retry. |
| **O que pode modificar** | Código cliente de enqueue; funções edge; tipos de evento; documentação operacional curta no PR. |
| **O que não deve modificar** | Políticas RLS sem revisão conjunta com agente Supabase; esquema sem migração. |
| **Entradas** | Canal alvo; evento de negócio; requisitos de entrega (sync vs async). |
| **Saídas** | Desenho do fluxo; payloads; monitorização sugerida; fallbacks. |
| **Checklist** | (1) Precisa outbox? (2) Idempotência? (3) Segredos só no servidor? (4) Rate limit / custo LLM? (5) Mensagem clara ao utilizador se falhar? |
| **Riscos que ajuda a evitar** | **Integrações improvisadas**; dupla submissão; custo API descontrolado; PII em logs de LLM. |

---

### 4.7 Agente de Organização, Equipa & Permissões (Produto + Técnico)

| Campo | Conteúdo |
|--------|-----------|
| **Nome** | Organização & equipa |
| **Especialidade** | **Multi-tenant**, `OrganizationContext`, convites (`organizationInvites`, `JoinOrganizationPage`), membros (`EquipePage`, `organizationMembers`), papéis `owner`/`member` e **RLS** associada. |
| **Missão** | Endurecer o módulo de equipa **sem quebrar** o modelo atual de org — alinhar UX administrativa com garantias no servidor. |
| **Quando acionar** | Novos papéis; permissões por função; convites; bugs “membro vê o que não devia”; gestão de organizações. |
| **O que analisa** | UI de equipa + migrações relevantes (`organization_*`); RPCs; efeitos em `client/src/api/teams.ts` e afins. |
| **O que pode modificar** | UI e fluxos; chamadas API; **em conjunto** com agente Supabase, políticas e tabelas. |
| **O que não deve modificar** | Sozinho, esquema de autorização crítico sem revisão cruzada. |
| **Entradas** | Matriz desejada de permissões; cenários (owner vs member). |
| **Saídas** | Plano de permissão; alterações coordenadas SQL+UI; checklist de regressão. |
| **Checklist** | (1) Toda query filtra org? (2) UI esconde ações sem permissão **e** servidor nega? (3) Convites auditáveis? (4) Remoção de membro não órfã dados indevidos? |
| **Riscos que ajuda a evitar** | **Módulo de equipa fraco** vira vazamento de dados; UX enganosa (“botão aparece mas falha”); estados sem organização ativa. |

---

### 4.8 Agente de Desempenho, Escalabilidade & Operação

| Campo | Conteúdo |
|--------|-----------|
| **Nome** | Desempenho & escalabilidade |
| **Especialidade** | **Listas grandes**, importações, relatórios agregados, RPCs de batch, índices documentados em `docs/scalability-*.md` e migrações `scalability_*`. |
| **Missão** | Evitar **gargalos** antes que a base cresça: queries caras, falta de paginação, jobs longos no cliente. |
| **Quando acionar** | Lentidão; novos relatórios; importação Excel; grid grande; picos de uso esperados. |
| **O que analisa** | Queries e planos (conceitualmente); uso de batch; tamanho de payload; rerenders React óbvios. |
| **O que pode modificar** | Otimizações pontuais; sugestões de RPC; memoização; limite de page size — **sempre** alinhado com agente Supabase quando SQL. |
| **O que não deve modificar** | Regras de negócio sem medir impacto; “otimizar” à custa de segurança. |
| **Entradas** | Sintoma; volume esperado; rota crítica. |
| **Saídas** | Hipóteses ordenadas; quick wins; métricas a observar. |
| **Checklist** | (1) Paginação/batch? (2) Índice adequado? (3) Agregação no servidor? (4) Cliente só renderiza o necessário? |
| **Riscos que ajuda a evitar** | **CRM lento** com dados reais; timeouts; custo Supabase elevado. |

---

### 4.9 Agente de Segurança & Conformidade

| Campo | Conteúdo |
|--------|-----------|
| **Nome** | Segurança & conformidade |
| **Especialidade** | **Auth**, exposição de chaves, **PII** (CPF/CNPJ, contactos), validação de input, headers em functions, princípio do menor privilégio. |
| **Missão** | Impedir regressões de segurança quando o produto acelera. |
| **Quando acionar** | Novas integrações; funções edge; uploads; qualquer uso de dados pessoais; alteração em convites/auth. |
| **O que analisa** | `.env` / Vite vars; chamadas supabase; logging; validação Zod/manual; CORS e segredos. |
| **O que pode modificar** | Reforços de validação; remoção de logs sensíveis; hardening pontual — com PR pequeno. |
| **O que não deve modificar** | Fluxo de negócio sem entender impacto; desativar RLS “temporariamente”. |
| **Entradas** | Superfície de ataque nova; dados tratados. |
| **Saídas** | Lista de riscos; mitigação; testes manuais sugeridos. |
| **Checklist** | (1) Dados mínimos expostos? (2) Secrets só servidor? (3) Input validado? (4) Logs limpos? (5) Dependências com CVEs óbvias (quando aplicável)? |
| **Riscos que ajuda a evitar** | **Fuga de PII**; chaves no bundle; bypass de auth por RPC mal protegida. |

---

### 4.10 Agente de Revisão Técnica Final

| Campo | Conteúdo |
|--------|-----------|
| **Nome** | Revisão técnica final |
| **Especialidade** | **Consistência global do PR**: requisitos das secções 2 e 8; conflitos entre agentes; testes mínimos. |
| **Missão** | Ser o **gate** antes de merge: encontrar lacunas que especialistas isolados não viram. |
| **Quando acionar** | Final de qualquer fluxo multiagente; mudanças em auth/tenant; release. |
| **O que analisa** | Diff completo; testes `*.test.ts`; impacto mobile; SQL+cliente alinhados. |
| **O que pode modificar** | Comentários; pedidos de ajuste; patches pequenos de correção. |
| **O que não deve modificar** | Reescrever feature alheia sem consenso. |
| **Entradas** | PR/diff; descrição original; notas dos outros agentes. |
| **Saídas** | **Aprovar / pedir alterações** com lista objetiva; riscos residuais. |
| **Checklist** | (1) Critérios de aceite? (2) regressões óbvias? (3) RLS? (4) UX mobile? (5) Integrações e secrets? |
| **Riscos que ajuda a evitar** | **Merge de alterações meia-boca**; bugs descobertos em produção pela equipa comercial. |

---

## 5. Fluxos de Trabalho

Cada fluxo indica **quem inicia**, **sequência**, **critério de passagem** e **saída final**.

### 5.1 Nova feature de produto (end-to-end)

| Etapa | Agente | Critério de passagem |
|-------|--------|----------------------|
| 1 | **Orquestrador** | Mapa de frentes e ficheiros; decisão cliente vs SQL vs edge. |
| 2 | **Arquitetura & fronteiras** | Acordo sobre onde vivem regras e estado. |
| 3 | **Backend & dados (Supabase)** | Migração/RPC/RLS desenhadas; risco de tenant validado. |
| 4 | **Frontend de aplicação** | UI integrada com RPC/queries; loading/erro. |
| 5 | **Mobile & responsividade** | Rotas críticas usáveis em viewport pequeno. |
| 6 | **Interface & biblioteca** | Conformidade EmbalaFlow; consistência visual. |
| 7 | **Segurança** | Se tocar em dados sensíveis, auth ou edge. |
| 8 | **Revisão técnica final** | Checklist OK. |

**Saída final:** PR(s) com SQL+migrations (se aplicável) + cliente + notas de deploy.

---

### 5.2 Refator de arquitetura (sem mudar regra de negócio)

| Etapa | Agente | Critério de passagem |
|-------|--------|----------------------|
| 1 | **Orquestrador** | Escopo e “não objetivos”. |
| 2 | **Arquitetura & fronteiras** | Plano de extração/módulos. |
| 3 | **Frontend** ou **Backend** conforme o foco | Patches incrementais; testes verdes. |
| 4 | **Revisão técnica final** | Nenhuma alteração comportamental não intencional. |

**Saída final:** Código mais modular; testes; nota de dívida remanescente.

---

### 5.3 Melhoria mobile

| Etapa | Agente | Critério de passagem |
|-------|--------|----------------------|
| 1 | **Orquestrador** | Lista de rotas afetadas. |
| 2 | **Mobile & responsividade** | Proposta de layout e correções. |
| 3 | **Interface & biblioteca** | Alinhamento com componentes existentes. |
| 4 | **Revisão técnica final** | Sem regressão desktop inaceitável. |

**Saída final:** Ajustes responsivos merged com critério visual acordado.

---

### 5.4 Nova integração ou canal (ex.: evento assíncrono, assistente, e-mail)

| Etapa | Agente | Critério de passagem |
|-------|--------|----------------------|
| 1 | **Orquestrador** | Sync vs async; dono do evento. |
| 2 | **Integrações & canais** | Desenho do fluxo + payloads. |
| 3 | **Backend & dados** | Tabela/fila/RPC necessários; RLS. |
| 4 | **Segurança** | Secrets, PII, rate limit. |
| 5 | **Frontend** | UX de sucesso/falha. |
| 6 | **Revisão técnica final** | |

**Saída final:** Integração com rastreio de falha e sem vazamento de credenciais.

---

### 5.5 Revisão de qualidade técnica (PR existente)

| Etapa | Agente | Critério de passagem |
|-------|--------|----------------------|
| 1 | **Revisão técnica final** | Lista de issues priorizada. |
| 2 | Especialista pontual (se necessário) | Um agente por tipo de problema (SQL vs UI vs integração). |
| 3 | **Revisão técnica final** | Re-validate. |

**Saída final:** PR aprovado ou com alterações objetivas.

---

### 5.6 Evolução de design system / biblioteca

| Etapa | Agente | Critério de passagem |
|-------|--------|----------------------|
| 1 | **Interface & biblioteca** | Novo padrão ou refino de componente. |
| 2 | **Frontend** | Adoção nas páginas que motivaram a mudança. |
| 3 | **Mobile** | Comportamento em telas pequenas. |
| 4 | **Revisão técnica final** | |

**Saída final:** Componente reutilizável; páginas migradas ou guia de uso no PR.

---

## 6. Regras de Handoff entre Agentes

**Formato mínimo de contexto (copiar/preencher):**

```text
## Objetivo
<uma frase>

## Escopo
Em escopo: ...
Fora de escopo: ...

## Estado
Branch / PR: ...
Ambiente: local | staging

## Ficheiros já identificados
- client/src/...
- supabase/...

## Comportamento actual vs esperado
Actual: ...
Esperado: ...

## Multi-tenant / auth
Organização: ... | N/A
Papéis: ...

## Riscos
- ...

## Pendências para o próximo agente
- ...
```

**Regras:**

- **Problema primeiro, solução depois** — o próximo agente deve poder continuar sem reler o chat inteiro.
- **Ficheiros afetados** — caminhos reais, não “o ficheiro do Kanban”.
- **Riscos** — explícitos (dados, perf, segurança).
- **Pendências** — com owner sugerido (qual agente).
- **Evitar retrabalho** — marcar o que já foi tentado e falhou; anexar mensagem de erro literal.
- **Um dono por frente** — dois agentes não editam o mesmo ficheiro na mesma iteração sem Orquestrador.

---

## 7. Templates de Acionamento (Cursor)

**Subagentes no repositório:** definições em [`.cursor/agents/`](.cursor/agents/) (YAML frontmatter + papel resumido). Pode invocar pelo nome (ex.: `/embaflow-supabase`) ou pedir delegação explícita; o conteúdo normativo completo continua neste ficheiro.

Substitua o texto entre `<…>` e cole no chat. Use **um agente por mensagem** quando a tarefa for ambígua.

**Orquestrador**

> Atua como **Orquestrador EmbalaFlow**. Analisa o pedido: `<descrever>`. Mapeia frentes (cliente React, Supabase SQL/RLS, edge functions), lista ficheiros prováveis, define ordem dos agentes e riscos. Não escrevas código ainda.

**Arquitetura & fronteiras**

> Atua como **Agente de Arquitetura & fronteiras**. Para `<feature>`, diz onde deve viver a lógica (React vs RPC vs edge), aponta acoplamentos atuais em `<paths>` e propõe um plano incremental. Cita ficheiros.

**Backend & dados (Supabase)**

> Atua como **Agente Backend & dados (Supabase)**. Para `<requisito>`, define alterações a `supabase/migrations/`, impacto em RLS/`organization_id`, RPCs necessários e ordem de aplicação. Inclui riscos de migração e testes SQL sugeridos.

**Frontend de aplicação**

> Atua como **Agente de Frontend de aplicação (React)**. Implementa ou revê `<fluxo>` em `<Page.tsx>`, usando `client/src/api/` e padrões existentes. Garante loading/erro e invalidação de queries. Lista ficheiros tocados.

**Mobile & responsividade**

> Atua como **Agente Mobile & responsividade**. Revisa `<rota ou componente>` para viewport estreito (bottom nav, modais, tabelas). Propõe alterações concretas em Tailwind/JSX. Não mudes regras de negócio.

**Interface & biblioteca EmbalaFlow**

> Atua como **Agente de Interface, UX & biblioteca EmbalaFlow**. Ajusta `<página>` para cumprir `embaflow-crm-ui`: hierarquia, `SectionCard`, toolbars, empty states. Reutiliza `components/library`. Sem slogans redundantes.

**Integrações & canais**

> Atua como **Agente de Integrações & canais**. Desenha o fluxo para `<canal ou automação>` usando padrões do projeto (outbox, edge functions, `client/src/api/outbox.ts` se aplicável). Define payloads, idempotência e tratamento de erro na UI.

**Organização & equipa**

> Atua como **Agente Organização & equipa**. Analisa permissões para `<cenário>` coordenando UI (`EquipePage`, contexts) com RLS/políticas Supabase. Entrega matriz owner/member e gaps actuais.

**Desempenho & escalabilidade**

> Atua como **Agente Desempenho & escalabilidade**. Diagnostica lentidão em `<rota ou operação>`; verifica N+1, paginação, RPCs e índices. Proposta priorizada de quick wins; coordena com SQL se necessário.

**Segurança**

> Atua como **Agente Segurança & conformidade**. Revisa `<superfície>` para exposição de secrets, PII em logs, validação de input e bypass de RLS. Lista achados por severidade e mitigação.

**Revisão técnica final**

> Atua como **Agente Revisão técnica final**. Revisa o diff de `<PR ou lista de ficheiros>` face aos critérios do `agents.md`: tenant, mobile, integrações, UI EmbalaFlow. Entrega veredito **aprovar / alterar** com bullet points objetivos.

---

## 8. Regras de Qualidade

Toda saída deve:

| Critério | O que significa |
|----------|------------------|
| **Clareza** | Frases curtas; passos numerados quando for plano. |
| **Objetividade** | Sem adjetivos vazios; cada afirmação ligada a ficheiro ou query. |
| **Profundidade** | Cobrir auth/tenant quando relevante; não ignorar edge cases de equipa. |
| **Lastro em código** | Referências a paths reais (`client/src/...`, `supabase/...`). |
| **Impacto técnico** | Migrações, invalidação de cache, deploy de functions. |
| **Impacto no produto** | Efeito no utilizador comercial (mobile, tempo, erros). |
| **Viabilidade** | Passos executáveis no repo actual; sem “rewrite total” salvo decisão explícita. |

**Não aceite:** “está ótimo” sem evidência; “refatorar tudo”; sugestões que violam RLS ou misturam secrets no cliente.

---

## 9. Backlog Orientado por Agentes

Modelo de item (copiar para issues / lista interna):

| Campo | Descrição |
|-------|-----------|
| **Título** | Verbo + objeto (ex.: “Paginar histórico de interações por cliente”). |
| **Objetivo** | Frase de valor para o negócio. |
| **Agente responsável** | Um primário; outros como “consultores”. |
| **Prioridade** | P0–P3 (P0 = quebra operação / segurança). |
| **Impacto** | Utilizadores afetados; frequência. |
| **Dificuldade** | S / M / L (inclui risco SQL). |
| **Ficheiros / pastas** | Lista inicial estimada. |
| **Dependências** | Migração antes de UI; feature flag; secret novo. |
| **Critério de aceite** | Testável; incluir mobile se UI; incluir tenant se dados. |

---

## 10. Diretrizes Finais

1. **Revê este ficheiro** quando: nova área funcional grande; mudança de stack Supabase; novo canal de integração; alteração relevante em RLS ou equipa.
2. **Mantém o número de agentes limitado** — prefere atualizar missões a multiplicar papéis.
3. **Sincroniza com a documentação existente** — `docs/INVENTORY.md`, notas de escalabilidade em `docs/`, regras `.cursor/rules/embaflow-crm-ui.mdc`.
4. **Regista decisões no repositório** — ADR curto em `docs/` quando o Orquestrador arbitrar trade-offs importantes.
5. **Usa o mesmo vocabulário do produto** — clientes, orçamentos, Kanban, interações, organização, equipa — para issues e PRs alinharem com o código.

---

*Documento gerado com base na estrutura real do repositório (workspace analisado): monorepo npm com `client/` (React/Vite), `supabase/migrations` e `supabase/functions`, multi-tenant e módulos CRM acima referidos.*
