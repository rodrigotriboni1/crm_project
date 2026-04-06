# Redesign do módulo de equipe — CRM EmbalaFlow

Documento de produto e arquitetura (pt-BR). Ancorado no código atual: `organizations`, `organization_members`, convites (`organization_invitations`), RLS em `clientes`/`orcamentos`/`interacoes`, UI em `[OrganizationMembersDialog.tsx](../client/src/components/OrganizationMembersDialog.tsx)` e `[OrganizationContext.tsx](../client/src/contexts/OrganizationContext.tsx)`.

**Estado (2026):** existem **equipas** (`teams` / `team_members`), **âmbito de dados** por membro, **auditoria** e página `[EquipePage](../client/src/pages/EquipePage.tsx)` com secção “Empresa e membros” (convites) e equipas. A provisão de novas empresas passa pela **consola admin** (app noutro repositório Git) e RPCs `admin_`* / `platform_*` (ver migração `20260406140000_platform_admin_billing.sql`).

---

## Sumário executivo

O módulo cobre **multi-tenant por organização** com **owner | member**, convites, **times** (squads), **data_scope** e **auditoria**. Itens em aberto de produto (atribuição automática avançada, territórios) mantêm-se na secção de backlog abaixo.

---

## 1. Diagnóstico resumido


| Área        | Situação atual                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------- |
| Arquitetura | Tenant = org; sem entidade Team; lógica em RPCs SQL                                               |
| Domínio     | Só `owner`/`member`; leitura ampla na org nas policies; escrita amarrada a `user_id = auth.uid()` |
| UX          | Modal “Equipe” + convites; sem página dedicada nem métricas                                       |
| Operação    | Entrada (convite/adicionar) forte; saída (remover/reassign) e governança fracos                   |


---

## 2. Estrutura alvo (entidades)

- **User** — identidade Auth + perfil
- **Organization** — tenant (já existe)
- **Team** — squad operacional dentro da org
- **TeamMember** — usuário no time + status + capacidade
- **Role** — papel de autorização (RBAC)
- **PermissionSet** — permissões atômicas
- **VisibilityScope** — own / team / territory / organization
- **Region / Territory** — segmentação geográfica ou comercial
- **AssignmentRule** — distribuição automática (round-robin, fallback, etc.)

---

## 3. MVP sugerido

1. Tabelas **Team** + **TeamMember** + **Role** mínimo (`owner`, `manager`, `rep`)
2. **VisibilityScope** mínimo: `organization` vs `own` (alinhado a `user_id` / futuro `assigned_user_id`)
3. Página **Equipe** (rota dedicada), reutilizando fluxo de convite atual
4. **Remover ou desativar** membro + política de reassign documentada
5. **Audit log** básico em mudanças de membership

**Fase 2:** AssignmentRule completo, territórios, simulador de permissões, dashboards avançados.

---

## Backlog e TODO (checklist)

Marque `[x]` conforme for concluindo. Prioridade sugerida: **P0** crítico, **P1** alto, **P2** médio.

### Documentação e decisão

- **DOC-01** (P1) Diagramar modelo atual: org, members, RLS em `clientes`/`orcamentos`/`interacoes`
- **DOC-02** (P0) ADR: visibilidade — RLS puro vs RPC vs camada híbrida
- **DOC-03** (P2) Glossário UI pt-BR: Organização (empresa) vs Equipe (pessoas) vs Time (squad)

### Modelagem e banco de dados

- **DB-01** (P0) Migration: tabela `teams` (`organization_id`, `name`, `leader_user_id?`, `is_active`)
- **DB-02** (P0) Migration: tabela `team_members` (`team_id`, `user_id`, `status`, `max_open_leads?`, timestamps)
- **DB-03** (P1) Migration: tabelas `roles` e `role_permissions` (ou enum + join) com seeds para org existente
- **DB-04** (P1) Coluna opcional `clientes.assigned_user_id` (ou equivalente) para carteira explícita
- **DB-05** (P2) Tabelas `regions` / `territories` e vínculos com time ou cliente

### Segurança e RLS

- **SEC-01** (P0) Policies alinhadas ao papel `rep`: leitura restrita a próprios registros (ou próprio + time)
- **SEC-02** (P0) Policies para `manager`: leitura do escopo do time (sem recursão infinita em `organization_members`)
- **SEC-03** (P1) Testes manuais / automatizados: dois usuários, mesma org, escopos diferentes

### RPCs e governança

- **RPC-01** (P1) `remove_organization_member` ou `deactivate_team_member` com validação de último owner
- **RPC-02** (P1) Fluxo de **reassign** de carteira ao remover vendedor (obrigatório ou fila manual)
- **RPC-03** (P2) Tabela `organization_audit_log` + gravação em insert/update membership e roles

### Atribuição automática (fase 2)

- **ASN-01** (P2) Tabela `assignment_rules` (`priority`, `match` jsonb, `strategy`, `target_team_id`)
- **ASN-02** (P2) Tabela `assignment_state` para round-robin
- **ASN-03** (P2) RPC ou trigger controlado: ao criar cliente, aplicar regra + respeitar capacidade e membros `active`

### Frontend / UX

- **UI-01** (P1) Nova rota `/organizacao/equipe` ou `/config/equipe` (lista de times + atalho para membros)
- **UI-02** (P1) Detalhe do time: membros, papéis, convites ao time (se diferente do convite à org)
- **UI-03** (P2) Tela matricial simplificada Role × ação (leitura)
- **UI-04** (P2) Dashboard equipe: KPIs por `user_id` (leads abertos, SLA) via RPC segura

### Convites e e-mail (operacional)

- **OPS-01** (P1) Runbook: `RESEND_API_KEY`, `APP_ALLOWED_ORIGINS`, Edge Function `send-org-invite-email`
- **OPS-02** (P2) Teste ponta a ponta: `/join?token=…` + signup com `invite_token` no metadata

### Issues estilo Linear (rótulos sugeridos)

Copiar para o tracker quando aplicável:


| ID       | Título                                           | Labels                                 |
| -------- | ------------------------------------------------ | -------------------------------------- |
| TEAM-001 | Entidade Team + TeamMember + RPC list            | `team-module`, `backend`, `feature`    |
| TEAM-002 | Visibilidade “somente próprios” para vendedor    | `permissions`, `visibility`, `backend` |
| TEAM-003 | Remover/desativar membro + reassign carteira     | `team-module`, `governance`, `backend` |
| TEAM-004 | Página Equipe (substituir ou complementar modal) | `team-module`, `frontend`, `ux`        |
| TEAM-05  | Assignment v1 (round-robin por time)             | `assignment`, `backend`                |
| TEAM-006 | Audit log de mudanças organizacionais            | `governance`, `backend`                |


---

## Ordem sugerida de execução

1. DOC-02 (ADR) → DB-01 / DB-02 → SEC-01 / SEC-02
2. RPC-01 / RPC-02 em paralelo com UI-01 após API estável
3. ASN-* após times e visibilidade mínimos
4. DOC-03 e OPS-01 em qualquer sprint para reduzir atrito operacional

---

## Referências no repositório

- Migrações: `supabase/migrations/20260402120000_organizations_multi_tenant.sql`, `20260403140000_organization_add_members.sql`, `20260404120000_organization_invitations.sql`
- Cliente: `client/src/contexts/OrganizationContext.tsx`, `client/src/components/OrganizationMembersDialog.tsx`, `client/src/api/organizationInvites.ts`, `client/src/pages/JoinOrganizationPage.tsx`

---

*Última atualização: gerado como backlog vivo; ajuste prioridades conforme o produto.*