import { describe, expect, it } from 'vitest'
import { brazilPhoneDigitsForLinks, telHrefBrazil, whatsappHrefBrazil } from '@/lib/phoneActionLinks'

describe('brazilPhoneDigitsForLinks', () => {
  it('normaliza 11 dígitos com DDD', () => {
    expect(brazilPhoneDigitsForLinks('(11) 98765-4321')).toBe('5511987654321')
  })
  it('normaliza 10 dígitos fixo', () => {
    expect(brazilPhoneDigitsForLinks('1134567890')).toBe('551134567890')
  })
  it('aceita já com 55', () => {
    expect(brazilPhoneDigitsForLinks('5511987654321')).toBe('5511987654321')
  })
  it('rejeita curto', () => {
    expect(brazilPhoneDigitsForLinks('119')).toBeNull()
  })
})

describe('telHrefBrazil / whatsappHrefBrazil', () => {
  it('gera tel e wa', () => {
    expect(telHrefBrazil('11987654321')).toBe('tel:+5511987654321')
    expect(whatsappHrefBrazil('11987654321')).toBe('https://wa.me/5511987654321')
  })
})
