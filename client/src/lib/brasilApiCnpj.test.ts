import { describe, expect, it } from 'vitest'
import {
  buildObservacoesFromCnpj,
  displayNameFromCnpj,
  mapBrasilApiCnpjToDraft,
  phoneDigitsFromBrasilApi,
  type BrasilApiCnpjResponse,
} from './brasilApiCnpj'

const sample: BrasilApiCnpjResponse = {
  cnpj: '06990590000123',
  razao_social: 'GOOGLE BRASIL INTERNET LTDA.',
  nome_fantasia: '',
  descricao_situacao_cadastral: 'ATIVA',
  logradouro: 'AV BRIG FARIA LIMA',
  numero: '3477',
  complemento: 'SALA 1',
  bairro: 'ITAIM BIBI',
  municipio: 'SAO PAULO',
  uf: 'SP',
  cep: '04538133',
  email: 'contato@exemplo.com',
  ddd_telefone_1: '1123958400',
  cnae_fiscal: 6319400,
  cnae_fiscal_descricao: 'Portais e conteúdo',
}

describe('brasilApiCnpj', () => {
  it('displayNameFromCnpj usa fantasia quando existe', () => {
    expect(displayNameFromCnpj({ ...sample, nome_fantasia: 'Google BR' })).toBe('Google BR')
  })

  it('displayNameFromCnpj cai na razão social sem fantasia', () => {
    expect(displayNameFromCnpj(sample)).toBe('GOOGLE BRASIL INTERNET LTDA.')
  })

  it('phoneDigitsFromBrasilApi extrai dígitos do telefone principal', () => {
    expect(phoneDigitsFromBrasilApi(sample)).toBe('1123958400')
  })

  it('buildObservacoesFromCnpj inclui situação e endereço', () => {
    const t = buildObservacoesFromCnpj(sample)
    expect(t).toContain('ATIVA')
    expect(t).toContain('GOOGLE BRASIL')
    expect(t).toContain('SAO PAULO/SP')
    expect(t).toContain('6319400')
  })

  it('mapBrasilApiCnpjToDraft agrega nome, telefone e obs', () => {
    const d = mapBrasilApiCnpjToDraft(sample)
    expect(d.nome).toBe('GOOGLE BRASIL INTERNET LTDA.')
    expect(d.telefoneDigits).toBe('1123958400')
    expect(d.observacoesExtra.length).toBeGreaterThan(20)
  })
})
