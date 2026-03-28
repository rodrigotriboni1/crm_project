/** Prefixo único para chaves de `localStorage` do app. */
export const APP_STORAGE_PREFIX = 'embala_'

export const SIDEBAR_COLLAPSED_KEY = `${APP_STORAGE_PREFIX}sidebar-collapsed`

export const KANBAN_VIEW_KEY = `${APP_STORAGE_PREFIX}kanban_view`

/** Chave legada (typo) — lida uma vez para migração. */
export const LEGACY_SIDEBAR_COLLAPSED_KEY = 'embalfow-sidebar-collapsed'

export function assistantActiveThreadKey(userId: string): string {
  return `${APP_STORAGE_PREFIX}assistant_active_thread_${userId}`
}
