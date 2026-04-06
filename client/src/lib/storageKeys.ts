/** Prefixo único para chaves de `localStorage` do app. */
export const APP_STORAGE_PREFIX = 'embala_'

export const SIDEBAR_COLLAPSED_KEY = `${APP_STORAGE_PREFIX}sidebar-collapsed`

/** `light` | `dark` — preferência de tema (classe `.dark` em `document.documentElement`). */
export const THEME_KEY = `${APP_STORAGE_PREFIX}theme`

export const KANBAN_VIEW_KEY = `${APP_STORAGE_PREFIX}kanban_view`

/** Chave legada (typo) — lida uma vez para migração. */
export const LEGACY_SIDEBAR_COLLAPSED_KEY = 'embalfow-sidebar-collapsed'

export type AssistantStorageScope =
  | 'dashboard'
  | 'reports'
  | 'generic'
  | 'kanban'
  | 'clientes'
  | 'cliente_detail'
  | 'produtos'
  | 'orcamentos_list'

export const ASSISTANT_RAIL_COLLAPSED_KEY = `${APP_STORAGE_PREFIX}assistant_rail_collapsed`

/** Última organização activa por utilizador (multi-tenant). */
export function activeOrganizationStorageKey(userId: string): string {
  return `${APP_STORAGE_PREFIX}active_org_${userId}`
}

export function assistantActiveThreadKey(
  userId: string,
  scope: AssistantStorageScope = 'dashboard',
  organizationId?: string
): string {
  const org = organizationId ?? 'legacy'
  if (scope === 'reports')
    return `${APP_STORAGE_PREFIX}assistant_active_thread_reports_${org}_${userId}`
  if (scope === 'generic')
    return `${APP_STORAGE_PREFIX}assistant_active_thread_generic_${org}_${userId}`
  if (scope === 'kanban')
    return `${APP_STORAGE_PREFIX}assistant_active_thread_kanban_${org}_${userId}`
  if (scope === 'clientes')
    return `${APP_STORAGE_PREFIX}assistant_active_thread_clientes_${org}_${userId}`
  if (scope === 'cliente_detail')
    return `${APP_STORAGE_PREFIX}assistant_active_thread_cliente_${org}_${userId}`
  if (scope === 'produtos')
    return `${APP_STORAGE_PREFIX}assistant_active_thread_produtos_${org}_${userId}`
  if (scope === 'orcamentos_list')
    return `${APP_STORAGE_PREFIX}assistant_active_thread_orcamentos_${org}_${userId}`
  return `${APP_STORAGE_PREFIX}assistant_active_thread_${org}_${userId}`
}
