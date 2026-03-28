import type { FieldDefinition } from '@/types/fields'
import { formatBrazilPhone } from './brPhone'
import { formatCnpj, formatCpf, formatCpfCnpj } from './brDocument'
import { formatCep } from './brCep'
import { digitsOnly } from './digits'

/**
 * Formata valor já persistido para exibição somente leitura (listas, cards).
 * Aceita texto com ou sem máscara; normaliza dígitos quando o tipo exige.
 */
export function formatFieldValueForDisplay(
  field: Pick<FieldDefinition, 'kind' | 'documentVariant'>,
  raw: string | null | undefined
): string {
  if (raw == null || raw === '') return ''
  switch (field.kind) {
    case 'phone':
    case 'tel':
      return formatBrazilPhone(raw)
    case 'cep':
      return formatCep(raw)
    case 'document': {
      const v = field.documentVariant ?? 'cpf_cnpj'
      const d = digitsOnly(raw)
      if (v === 'cpf') return formatCpf(d)
      if (v === 'cnpj') return formatCnpj(d)
      return formatCpfCnpj(d)
    }
    default:
      return raw
  }
}
