/** Prefixo único para chaves de `localStorage` do app. */
export const APP_STORAGE_PREFIX = 'embala_'

export const SIDEBAR_COLLAPSED_KEY = `${APP_STORAGE_PREFIX}sidebar-collapsed`

/** `light` | `dark` — preferência de tema (classe `.dark` em `document.documentElement`). */
export const THEME_KEY = `${APP_STORAGE_PREFIX}theme`

export const KANBAN_VIEW_KEY = `${APP_STORAGE_PREFIX}kanban_view`

/** Chave legada (typo) — lida uma vez para migração. */
export const LEGACY_SIDEBAR_COLLAPSED_KEY = 'embalfow-sidebar-collapsed'

export type AssistantStorageScope = 'dashboard' | 'reports' | 'generic'

export const ASSISTANT_RAIL_COLLAPSED_KEY = `${APP_STORAGE_PREFIX}assistant_rail_collapsed`

export function assistantActiveThreadKey(userId: string, scope: AssistantStorageScope = 'dashboard'): string {
  if (scope === 'reports') return `${APP_STORAGE_PREFIX}assistant_active_thread_reports_${userId}`
  if (scope === 'generic') return `${APP_STORAGE_PREFIX}assistant_active_thread_generic_${userId}`
  return `${APP_STORAGE_PREFIX}assistant_active_thread_${userId}`
}
