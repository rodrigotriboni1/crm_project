/**
 * Mensagens de Auth (GoTrue / Supabase) em português para o utilizador final.
 */

function rawMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message)
  return String(err ?? '')
}

function statusOf(err: unknown): number | undefined {
  if (err && typeof err === 'object' && 'status' in err) {
    const s = (err as { status: unknown }).status
    return typeof s === 'number' ? s : undefined
  }
  return undefined
}

/**
 * @param mode — distingue mensagens de login vs. registo quando faz sentido
 */
export function mapAuthErrorForUser(err: unknown, mode: 'login' | 'signup'): string {
  const msg = rawMessage(err).trim()
  const lower = msg.toLowerCase()
  const status = statusOf(err)

  if (status === 429 || lower.includes('too many requests') || lower.includes('rate limit')) {
    return 'Foram feitas demasiadas tentativas. Aguarde alguns minutos e tente de novo.'
  }

  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid credentials') ||
    lower === 'invalid email or password'
  ) {
    return mode === 'login'
      ? 'E-mail ou senha incorrectos. Verifique os dados ou use «Criar conta» se ainda não tiver registo.'
      : 'Não foi possível iniciar sessão com estes dados.'
  }

  if (
    lower.includes('email not confirmed') ||
    lower.includes('not confirmed') ||
    lower.includes('email_not_confirmed')
  ) {
    return 'Confirme o endereço de e-mail antes de iniciar sessão (verifique a caixa de entrada e o spam).'
  }

  if (
    lower.includes('user already registered') ||
    lower.includes('already been registered') ||
    lower.includes('already exists') ||
    lower.includes('user_already_exists')
  ) {
    return 'Este e-mail já está registado. Use «Já tenho conta» para iniciar sessão ou recuperar a senha no Supabase.'
  }

  if (lower.includes('signup') && (lower.includes('not allowed') || lower.includes('disabled'))) {
    return 'Novos registos estão desactivados neste projecto. Contacte o administrador.'
  }

  if (lower.includes('password') && (lower.includes('least') || lower.includes('short') || lower.includes('weak'))) {
    return 'A senha é demasiado fraca ou curta. Use pelo menos 8 caracteres, de preferência com letras e números.'
  }

  if (
    lower.includes('database error saving new user') ||
    lower.includes('error saving new user') ||
    lower.includes('unexpected_failure')
  ) {
    return 'Não foi possível concluir o registo no servidor (erro ao guardar a conta). Se persistir, o administrador deve verificar as migrações Supabase e os registos da base de dados.'
  }

  if (lower.includes('invalid email')) {
    return 'O endereço de e-mail não é válido.'
  }

  if (msg) return msg

  return mode === 'signup'
    ? 'Não foi possível criar a conta. Tente de novo ou contacte o suporte.'
    : 'Não foi possível iniciar sessão. Tente de novo ou contacte o suporte.'
}
