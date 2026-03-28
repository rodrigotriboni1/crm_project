import { describe, expect, it } from 'vitest'
import { INTERACAO_CANAIS, INTERACAO_CANAIS_USUARIO, isInteracaoCanal } from './interacaoCanal'

describe('interacaoCanal', () => {
  it('lista de utilizador é subconjunto dos canais persistidos', () => {
    const set = new Set(INTERACAO_CANAIS)
    for (const c of INTERACAO_CANAIS_USUARIO) {
      expect(set.has(c)).toBe(true)
    }
    expect(set.has('Sistema')).toBe(true)
  })

  it('isInteracaoCanal reconhece valores canónicos', () => {
    expect(isInteracaoCanal('WhatsApp')).toBe(true)
    expect(isInteracaoCanal('Sistema')).toBe(true)
    expect(isInteracaoCanal('spam')).toBe(false)
  })
})
