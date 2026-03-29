import { describe, expect, it } from 'vitest'
import { isValidCnpjDigits, isValidCpfDigits } from '@/lib/brCpfCnpj'

describe('isValidCpfDigits', () => {
  it('rejects known invalid patterns', () => {
    expect(isValidCpfDigits('11111111111')).toBe(false)
    expect(isValidCpfDigits('00000000000')).toBe(false)
    expect(isValidCpfDigits('12345678901')).toBe(false)
  })
  it('accepts valid CPF (checksum)', () => {
    expect(isValidCpfDigits('39053344705')).toBe(true)
  })
  it('requires length 11', () => {
    expect(isValidCpfDigits('3905334470')).toBe(false)
    expect(isValidCpfDigits('390533447050')).toBe(false)
  })
})

describe('isValidCnpjDigits', () => {
  it('rejects all same digit', () => {
    expect(isValidCnpjDigits('11111111111111')).toBe(false)
  })
  it('accepts valid CNPJ (checksum)', () => {
    expect(isValidCnpjDigits('11222333000181')).toBe(true)
  })
  it('requires length 14', () => {
    expect(isValidCnpjDigits('1122233300018')).toBe(false)
  })
})
