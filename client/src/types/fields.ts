/**
 * Padrões de metadados de campo para formulários e listagens.
 * Use com `UiComponent` para renderização consistente.
 */

export const FIELD_KINDS = [
  'text',
  'shortText',
  'textarea',
  'longText',
  'email',
  'password',
  'tel',
  'phone',
  'number',
  'currency',
  'date',
  'datetime-local',
  'select',
  'json',
  'document',
  'cep',
] as const

export type FieldKind = (typeof FIELD_KINDS)[number]

export type DocumentVariant = 'cpf' | 'cnpj' | 'cpf_cnpj'

export type SelectOption = { value: string; label: string }

export type FieldDefinition = {
  /** Identificador estável (ex.: nome da coluna ou chave do formulário) */
  id: string
  kind: FieldKind
  label: string
  placeholder?: string
  /** Texto auxiliar abaixo do controle */
  description?: string
  optional?: boolean
  disabled?: boolean
  autoComplete?: string
  /** `select` e opcionalmente `json` como texto estruturado */
  options?: SelectOption[]
  /** `textarea` / `longText` / `json` */
  rows?: number
  min?: number
  max?: number
  step?: number
  /** `shortText` / `text` */
  maxLength?: number
  /** Obrigatório para `kind === 'document'` (padrão em runtime: `cpf_cnpj`) */
  documentVariant?: DocumentVariant
}

export function fieldLabelText(field: FieldDefinition): string {
  if (field.optional) return `${field.label} (opcional)`
  return field.label
}
