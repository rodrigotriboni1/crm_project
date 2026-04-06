/**
 * Política para futuras acções da IA sobre dados do CRM (mutações).
 *
 * Regras obrigatórias antes de expor "ferramentas" ao modelo:
 * - Executar sempre no backend (Edge Function ou RPC) com JWT do utilizador; nunca `service_role` no browser.
 * - Cada operação deve repetir as mesmas verificações que a UI (RLS, organization_id, assigned_user / data scope).
 * - Mutações destrutivas ou financeiras: confirmação explícita na UI antes de chamar o backend.
 * - Preferir idempotência (chaves de idempotência ou estados claros) para evitar duplicar orçamentos ou interações.
 * - Registar auditoria quando existir `organization_audit` ou equivalente.
 *
 * O assistente actual permanece só leitura: o system prompt proíbe afirmar que alterou o sistema.
 */

export const ASSISTANT_MUTATIONS_POLICY_VERSION = 1 as const
