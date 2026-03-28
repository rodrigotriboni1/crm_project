import { describe, expect, it } from 'vitest'
import { formatOrcamentoDisplayNum } from '@/lib/orcamentoDisplayNum'

describe('formatOrcamentoDisplayNum', () => {
  it('pads to 8 digits', () => {
    expect(formatOrcamentoDisplayNum(1)).toBe('00000001')
    expect(formatOrcamentoDisplayNum(12345678)).toBe('12345678')
  })

  it('floors non-integers and clamps negatives to 0', () => {
    expect(formatOrcamentoDisplayNum(3.7)).toBe('00000003')
    expect(formatOrcamentoDisplayNum(-5)).toBe('00000000')
  })
})
