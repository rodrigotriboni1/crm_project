import type { FieldDefinition } from '@/types'
import { clienteTipoOptions } from './selectOptions'

/** Formulário «Novo cliente» (lista). */
export const novoClienteFormFields = {
  taxId: {
    id: 'cliente-tax',
    kind: 'document',
    documentVariant: 'cpf_cnpj',
    label: 'CPF / CNPJ',
    placeholder: 'Opcional — CNPJ com 14 dígitos permite consulta automática',
    optional: true,
  } satisfies FieldDefinition,
  nome: {
    id: 'cliente-nome',
    kind: 'shortText',
    label: 'Nome / Empresa',
    placeholder: 'Nome completo ou razão social',
  } satisfies FieldDefinition,
  whatsapp: {
    id: 'cliente-whatsapp',
    kind: 'phone',
    label: 'WhatsApp',
  } satisfies FieldDefinition,
  tipo: {
    id: 'cliente-tipo',
    kind: 'select',
    label: 'Tipo',
    options: clienteTipoOptions,
  } satisfies FieldDefinition,
  telefone: {
    id: 'cliente-telefone',
    kind: 'phone',
    label: 'Telefone',
    optional: true,
  } satisfies FieldDefinition,
  produtos: {
    id: 'cliente-produtos',
    kind: 'longText',
    label: 'Produtos habituais',
  } satisfies FieldDefinition,
  obs: {
    id: 'cliente-obs',
    kind: 'longText',
    label: 'Observações',
    optional: true,
  } satisfies FieldDefinition,
} as const

/** Card «Dados do cliente» no detalhe (blur-to-save). */
export const clienteDetailCardFields = {
  taxId: {
    id: 'cd-tax',
    kind: 'document',
    documentVariant: 'cpf_cnpj',
    label: 'CPF / CNPJ',
    placeholder: 'Opcional',
    optional: true,
  } satisfies FieldDefinition,
  nome: {
    id: 'cd-nome',
    kind: 'shortText',
    label: 'Nome / Empresa',
  } satisfies FieldDefinition,
  tipo: {
    id: 'cd-tipo',
    kind: 'select',
    label: 'Tipo',
    options: clienteTipoOptions,
  } satisfies FieldDefinition,
  whatsapp: {
    id: 'cd-wa',
    kind: 'phone',
    label: 'WhatsApp',
  } satisfies FieldDefinition,
  telefone: {
    id: 'cd-tel',
    kind: 'phone',
    label: 'Telefone',
    optional: true,
  } satisfies FieldDefinition,
  produtos: {
    id: 'cd-prod',
    kind: 'longText',
    label: 'Produtos habituais',
  } satisfies FieldDefinition,
  obs: {
    id: 'cd-obs',
    kind: 'longText',
    label: 'Observações',
    optional: true,
  } satisfies FieldDefinition,
} as const

/** Metadados mínimos para `formatFieldValueForDisplay` na lista de clientes. */
export const clienteListPhoneDisplayField = { kind: 'phone' as const }
