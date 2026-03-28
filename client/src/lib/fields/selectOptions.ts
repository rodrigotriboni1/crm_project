import { CANAIS_CONTATO, ORCAMENTO_STATUS_ORDER, orcamentoStatusLabel } from '@/hooks/useCrm'
import type { SelectOption } from '@/types/fields'

export const clienteTipoOptions: SelectOption[] = [
  { value: 'novo', label: 'Novo' },
  { value: 'recompra', label: 'Recompra' },
]

export function orcamentoStatusOptions(): SelectOption[] {
  return ORCAMENTO_STATUS_ORDER.map((s) => ({
    value: s,
    label: orcamentoStatusLabel(s),
  }))
}

export const canalContatoOptions: SelectOption[] = CANAIS_CONTATO.map((c) => ({
  value: c,
  label: c,
}))
