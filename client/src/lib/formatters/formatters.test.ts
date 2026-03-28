import { describe, expect, it } from 'vitest'
import { digitsOnly } from './digits'
import { formatBrazilPhone, parseBrazilPhoneInput } from './brPhone'
import { formatCpf, formatCnpj, formatCpfCnpj, parseCpfInput, parseCnpjInput } from './brDocument'
import { formatCep, parseCepInput } from './brCep'
import { formatFieldValueForDisplay } from './display'

describe('digitsOnly', () => {
  it('remove não-dígitos', () => {
    expect(digitsOnly('(17) 99663-0308')).toBe('17996630308')
    expect(digitsOnly('')).toBe('')
  })
})

describe('formatBrazilPhone', () => {
  it('formata celular 11 dígitos', () => {
    expect(formatBrazilPhone('17996630308')).toBe('(17) 99663-0308')
  })
  it('formata fixo 10 dígitos', () => {
    expect(formatBrazilPhone('1133334444')).toBe('(11) 3333-4444')
  })
  it('parseBrazilPhoneInput limita a 11 dígitos', () => {
    expect(parseBrazilPhoneInput('(17) 99663-0308')).toBe('17996630308')
    expect(parseBrazilPhoneInput('5517996630308')).toBe('55179966303')
  })
})

describe('documentos BR', () => {
  it('formata CPF', () => {
    expect(formatCpf('12345678901')).toBe('123.456.789-01')
    expect(parseCpfInput('123.456.789-01')).toBe('12345678901')
  })
  it('formata CNPJ', () => {
    expect(formatCnpj('11222333000181')).toBe('11.222.333/0001-81')
    expect(parseCnpjInput('11.222.333/0001-81')).toBe('11222333000181')
  })
  it('cpf_cnpj alterna por tamanho', () => {
    expect(formatCpfCnpj('12345678901')).toBe('123.456.789-01')
    expect(formatCpfCnpj('11222333000181')).toBe('11.222.333/0001-81')
  })
})

describe('CEP', () => {
  it('formata e parseia', () => {
    expect(formatCep('01310100')).toBe('01310-100')
    expect(parseCepInput('01310-100')).toBe('01310100')
  })
})

describe('formatFieldValueForDisplay', () => {
  it('formata telefone a partir de string suja', () => {
    expect(formatFieldValueForDisplay({ kind: 'phone' }, '17 99663-0308')).toBe('(17) 99663-0308')
  })
})
