import { describe, expect, it } from 'vitest'
import { describeClienteTaxIdInputError, normalizeClienteTaxId } from '@/lib/taxId'

describe('normalizeClienteTaxId', () => {
  it('returns null for empty', () => {
    expect(normalizeClienteTaxId('')).toBeNull()
    expect(normalizeClienteTaxId('   ')).toBeNull()
  })
  it('accepts valid CPF/CNPJ digits', () => {
    expect(normalizeClienteTaxId('390.533.447-05')).toBe('39053344705')
    expect(normalizeClienteTaxId('11222333000181')).toBe('11222333000181')
  })
  it('rejects invalid checksum', () => {
    expect(normalizeClienteTaxId('11111111111')).toBeNull()
    expect(normalizeClienteTaxId('52998224705')).toBeNull()
    expect(normalizeClienteTaxId('11222333000180')).toBeNull()
  })
})

describe('describeClienteTaxIdInputError', () => {
  it('returns null for empty', () => {
    expect(describeClienteTaxIdInputError('')).toBeNull()
  })
  it('flags incomplete', () => {
    expect(describeClienteTaxIdInputError('390533447')).toContain('incompleto')
  })
})
