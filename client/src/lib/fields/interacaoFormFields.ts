import type { FieldDefinition } from '@/types'
import { canalContatoOptions } from './selectOptions'

/** Dialog «Registrar contato» no detalhe do cliente. */
export const clienteInteracaoFormFields = {
  canal: {
    id: 'cd-int-canal',
    kind: 'select',
    label: 'Canal',
    options: canalContatoOptions,
  } satisfies FieldDefinition,
  data: {
    id: 'cd-int-data',
    kind: 'date',
    label: 'Data contato',
  } satisfies FieldDefinition,
  anotacao: {
    id: 'cd-int-anot',
    kind: 'longText',
    label: 'Anotação',
  } satisfies FieldDefinition,
} as const
