import { cn } from '@/lib/utils'
import { orcamentoStatusLabel } from '@/hooks/useCrm'
import type { OrcamentoStatus } from '@/types/database'

/** Tailwind classes for status pills (tokens — legível em claro e escuro) */
export const STATUS_BADGE_STYLES: Record<OrcamentoStatus, string> = {
  novo_contato:
    'border-[color-mix(in_srgb,var(--color-brand-primary)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand-primary)_10%,var(--color-background))] text-[var(--color-brand-primary)]',
  orcamento_enviado:
    'border-[color-mix(in_srgb,var(--color-brand-primary)_28%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-phase-proposal-dot)_12%,var(--color-background))] text-[var(--color-phase-proposal-text)]',
  dormindo:
    'border-[color-mix(in_srgb,var(--color-brand-warning)_40%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand-warning)_12%,var(--color-background))] text-[var(--color-phase-proposal-text)]',
  ganho:
    'border-[color-mix(in_srgb,var(--color-brand-success)_40%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand-success)_10%,var(--color-background))] text-[var(--color-brand-success)]',
  perdido:
    'border-[color-mix(in_srgb,var(--color-brand-danger)_40%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand-danger)_10%,var(--color-background))] text-[var(--color-brand-danger)]',
}

/** Left border accent for Kanban column headers */
export const STATUS_COLUMN_BORDER: Record<OrcamentoStatus, string> = {
  novo_contato: 'border-l-blue-500',
  orcamento_enviado: 'border-l-sky-500',
  dormindo: 'border-l-amber-500',
  ganho: 'border-l-green-500',
  perdido: 'border-l-red-500',
}

/** Top border accent for Kanban columns (sem borda lateral) */
export const STATUS_COLUMN_TOP: Record<OrcamentoStatus, string> = {
  novo_contato: 'border-t-blue-500',
  orcamento_enviado: 'border-t-sky-500',
  dormindo: 'border-t-amber-500',
  ganho: 'border-t-green-500',
  perdido: 'border-t-gray-400',
}

type Props = {
  status: OrcamentoStatus
  className?: string
}

export default function StatusBadge({ status, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 font-sans text-xs font-medium',
        STATUS_BADGE_STYLES[status],
        className
      )}
    >
      {orcamentoStatusLabel(status)}
    </span>
  )
}
