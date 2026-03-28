import { APP_STORAGE_PREFIX } from '@/lib/storageKeys'
import type { AssistantChatTurn } from '@/types/database'

export type { AssistantChatTurn }

const MAX_TURNS = 80

function storageKey(userId: string): string {
  return `${APP_STORAGE_PREFIX}assistant_turns_${userId}`
}

export function loadAssistantTurns(userId: string): AssistantChatTurn[] {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const out: AssistantChatTurn[] = []
    for (const item of parsed) {
      if (
        item &&
        typeof item === 'object' &&
        (item as { role: string }).role === 'user' &&
        typeof (item as { content: unknown }).content === 'string'
      ) {
        out.push({ role: 'user', content: (item as { content: string }).content })
      } else if (
        item &&
        typeof item === 'object' &&
        (item as { role: string }).role === 'assistant' &&
        typeof (item as { content: unknown }).content === 'string'
      ) {
        out.push({ role: 'assistant', content: (item as { content: string }).content })
      }
    }
    return out.slice(-MAX_TURNS)
  } catch {
    return []
  }
}

export function saveAssistantTurns(userId: string, turns: AssistantChatTurn[]): void {
  try {
    const trimmed = turns.slice(-MAX_TURNS)
    localStorage.setItem(storageKey(userId), JSON.stringify(trimmed))
  } catch {
    /* quota / private mode */
  }
}

export function clearAssistantTurns(userId: string): void {
  try {
    localStorage.removeItem(storageKey(userId))
  } catch {
    /* ignore */
  }
}
