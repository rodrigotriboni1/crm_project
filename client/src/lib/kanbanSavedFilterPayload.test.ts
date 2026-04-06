import { describe, expect, it } from 'vitest'
import {
  buildKanbanSavedFilterPayload,
  parseKanbanSavedFilterPayload,
} from '@/lib/kanbanSavedFilterPayload'
import { defaultKanbanAdvancedFilters } from '@/lib/kanbanFilters'

describe('kanbanSavedFilterPayload', () => {
  it('round-trips q and advanced', () => {
    const adv = { ...defaultKanbanAdvancedFilters(), valorMin: '100', followUp: 'today' as const }
    const p = buildKanbanSavedFilterPayload('  acme  ', adv)
    const out = parseKanbanSavedFilterPayload(p)
    expect(out).not.toBeNull()
    expect(out!.q).toBe('acme')
    expect(out!.advanced.valorMin).toBe('100')
    expect(out!.advanced.followUp).toBe('today')
  })

  it('returns null for wrong version', () => {
    expect(parseKanbanSavedFilterPayload({ v: 2, q: '', advanced: defaultKanbanAdvancedFilters() })).toBeNull()
  })
})
