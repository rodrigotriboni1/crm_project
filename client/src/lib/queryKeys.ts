/** React Query keys centralizadas (evitar conflitos em PRs paralelos). */
export const qk = {
  dashboard: (uid: string, orgId: string) => ['dashboard', uid, orgId] as const,
  reports: (uid: string, orgId: string, start: string, end: string) =>
    ['reports', uid, orgId, start, end] as const,
  clientes: (uid: string, orgId: string) => ['clientes', uid, orgId] as const,
  /** Lista completa para planilha / selectores (não usar na listagem paginada). */
  clientesPicker: (uid: string, orgId: string, ativosOnly: boolean) =>
    ['clientes', uid, orgId, 'picker', ativosOnly] as const,
  cliente: (uid: string, orgId: string, id: string) => ['cliente', uid, orgId, id] as const,
  orcamentos: (uid: string, orgId: string) => ['orcamentos', uid, orgId] as const,
  orcamento: (uid: string, orgId: string, id: string) => ['orcamento', uid, orgId, id] as const,
  orcamentosCliente: (uid: string, orgId: string, cid: string) =>
    ['orcamentos', uid, orgId, 'cliente', cid] as const,
  interacoes: (uid: string, orgId: string, cid: string) => ['interacoes', uid, orgId, cid] as const,
  produtos: (uid: string, orgId: string) => ['produtos', uid, orgId] as const,
  kanbanSavedFilters: (uid: string, orgId: string) => ['kanbanSavedFilters', uid, orgId] as const,
}
