import { INTERACAO_CANAIS_USUARIO } from '@/lib/interacaoCanal'
import { ORCAMENTO_STATUS_ORDER, orcamentoStatusLabel } from '@/lib/orcamentoStatusUi'
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

export const canalContatoOptions: SelectOption[] = INTERACAO_CANAIS_USUARIO.map((c) => ({
  value: c,
  label: c,
}))
