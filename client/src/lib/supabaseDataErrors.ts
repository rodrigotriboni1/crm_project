import type { PostgrestError } from '@supabase/supabase-js'

/** Banners e alertas inline — claro / escuro via tokens da marca */
export const cnAlertError =
  'rounded-md border border-[color-mix(in_srgb,var(--color-brand-danger)_45%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand-danger)_10%,var(--color-background))] px-3 py-2 text-sm text-[var(--color-brand-danger)]'

export const cnAlertWarning =
  'rounded-md border border-[color-mix(in_srgb,var(--color-brand-warning)_45%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand-warning)_10%,var(--color-background))] px-3 py-2 text-sm text-[var(--color-phase-proposal-text)]'

export const cnAlertInfo =
  'rounded-md border border-[color-mix(in_srgb,var(--color-brand-blue)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand-blue)_8%,var(--color-background))] px-3 py-2 text-sm text-[var(--color-brand-primary)] dark:text-[var(--color-brand-primary)]'

function isPostgrestError(err: unknown): err is PostgrestError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    'message' in err &&
    typeof (err as PostgrestError).message === 'string'
  )
}

export function isLikelyNetworkError(err: unknown): boolean {
  const m = err instanceof Error ? err.message : String(err ?? '')
  const lower = m.toLowerCase()
  return (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('load failed')
  )
}

/** Violação de unicidade (ex.: CPF/CNPJ por organização). */
export function isDuplicateKeyError(err: unknown): boolean {
  if (!isPostgrestError(err)) return false
  if (err.code === '23505') return true
  const m = `${err.message} ${err.details ?? ''}`.toLowerCase()
  return m.includes('duplicate key') || m.includes('unique constraint') || m.includes('already exists')
}

/** RLS ou permissão negada no Postgres. */
export function isRlsOrForbiddenError(err: unknown): boolean {
  if (!isPostgrestError(err)) return false
  if (err.code === '42501' || err.code === 'PGRST301') return true
  const m = err.message.toLowerCase()
  return (
    m.includes('row-level security') ||
    m.includes('violates row-level security') ||
    m.includes('permission denied') ||
    m.includes('new row violates row-level security policy')
  )
}

/**
 * Mensagem única para o utilizador a partir de erros de dados (PostgREST / rede).
 */
export function mapPostgrestOrNetworkError(err: unknown): string {
  if (isLikelyNetworkError(err)) {
    return 'Sem ligação ao servidor. Verifique a internet e tente de novo.'
  }

  if (isPostgrestError(err)) {
    if (isDuplicateKeyError(err)) {
      return 'Já existe um registo com estes dados (por exemplo, o mesmo CPF/CNPJ nesta organização).'
    }
    if (isRlsOrForbiddenError(err)) {
      return 'Não tem permissão para esta operação ou a base de dados não está actualizada. Peça ao administrador para aplicar as migrações Supabase ou confirme que pertence à organização correcta.'
    }
    if (err.message?.trim()) return err.message.trim()
  }

  if (err instanceof Error && err.message.trim()) {
    return err.message.trim()
  }

  return 'Ocorreu um erro ao comunicar com o servidor. Tente de novo.'
}

/**
 * Mensagem para mutações de cliente (duplicado pode ser tratado antes com merge).
 */
export function mapClienteMutationError(err: unknown): string {
  if (isLikelyNetworkError(err)) {
    return 'Sem ligação ao servidor. Verifique a internet e tente de novo.'
  }
  if (isPostgrestError(err) && isDuplicateKeyError(err)) {
    return 'Já existe um cliente com este CPF/CNPJ nesta organização.'
  }
  return mapPostgrestOrNetworkError(err)
}

/** Para RPC / inserts genéricos (ex.: `create_organization`). */
export function newUserFacingDataError(err: unknown): Error {
  return Object.assign(new Error(mapPostgrestOrNetworkError(err)), { cause: err })
}

/** Para `createCliente` e mutações semelhantes. */
export function newClienteMutationError(err: unknown): Error {
  return Object.assign(new Error(mapClienteMutationError(err)), { cause: err })
}
