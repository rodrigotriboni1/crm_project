/** React Query keys centralizadas (evitar conflitos em PRs paralelos). */
export const qk = {
  dashboard: (uid: string) => ['dashboard', uid] as const,
  reports: (uid: string, start: string, end: string) => ['reports', uid, start, end] as const,
  clientes: (uid: string) => ['clientes', uid] as const,
  cliente: (uid: string, id: string) => ['cliente', uid, id] as const,
  orcamentos: (uid: string) => ['orcamentos', uid] as const,
  orcamento: (uid: string, id: string) => ['orcamento', uid, id] as const,
  orcamentosCliente: (uid: string, cid: string) => ['orcamentos', uid, 'cliente', cid] as const,
  interacoes: (uid: string, cid: string) => ['interacoes', uid, cid] as const,
  produtos: (uid: string) => ['produtos', uid] as const,
}
