import type { FieldDefinition } from '@/types/fields'
import { formatBrazilPhone, parseBrazilPhoneInput } from './brPhone'
import {
  formatCnpj,
  formatCpf,
  formatCpfCnpj,
  parseCnpjInput,
  parseCpfCnpjInput,
  parseCpfInput,
} from './brDocument'
import { formatCep, parseCepInput } from './brCep'

export type FieldMaskFns = {
  displayValue: (raw: string) => string
  normalizeInput: (typed: string) => string
}

/** Campos que usam máscara + valor armazenado só com dígitos (quando aplicável). */
export function getFieldMask(field: FieldDefinition): FieldMaskFns | null {
  switch (field.kind) {
    case 'phone':
    case 'tel':
      return {
        displayValue: (raw) => formatBrazilPhone(raw),
        normalizeInput: parseBrazilPhoneInput,
      }
    case 'cep':
      return {
        displayValue: (raw) => formatCep(raw),
        normalizeInput: parseCepInput,
      }
    case 'document': {
      const v = field.documentVariant ?? 'cpf_cnpj'
      if (v === 'cpf') {
        return {
          displayValue: (raw) => formatCpf(raw),
          normalizeInput: parseCpfInput,
        }
      }
      if (v === 'cnpj') {
        return {
          displayValue: (raw) => formatCnpj(raw),
          normalizeInput: parseCnpjInput,
        }
      }
      return {
        displayValue: (raw) => formatCpfCnpj(raw),
        normalizeInput: parseCpfCnpjInput,
      }
    }
    default:
      return null
  }
}
