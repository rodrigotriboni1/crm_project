import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getAuthEmailRedirectTo } from '@/lib/authRedirect'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import LoadingScreen from '@/components/LoadingScreen'
import ThemeToggle from '@/components/ThemeToggle'

/** Evita dupla troca do mesmo código (ex.: React StrictMode). */
const pkceCodesAttempted = new Set<string>()

function decodeParam(v: string | null): string {
  if (!v) return ''
  try {
    return decodeURIComponent(v.replace(/\+/g, ' '))
  } catch {
    return v
  }
}

function messageForAuthError(code: string, description: string): string {
  if (code === 'otp_expired') {
    return 'O link de confirmação expirou ou já foi usado. Os links do Supabase são válidos por poucos minutos e só podem ser abertos uma vez. Peça um novo e-mail abaixo ou registe-se de novo com o mesmo e-mail.'
  }
  if (description) return description
  if (code) return `Não foi possível concluir a autenticação (${code}).`
  return 'Não foi possível concluir a autenticação.'
}

export default function AuthCallbackPage() {
  const { user, loading } = useAuth()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [resendPending, setResendPending] = useState(false)
  const [resendInfo, setResendInfo] = useState<string | null>(null)
  const [resendError, setResendError] = useState<string | null>(null)
  const [exchangeFailed, setExchangeFailed] = useState(false)
  const exchangeStarted = useRef(false)

  const { errorCode, errorDescription } = useMemo(() => {
    const code = (searchParams.get('error') ?? '').trim()
    const desc = decodeParam(searchParams.get('error_description'))
    return { errorCode: code, errorDescription: desc }
  }, [searchParams])

  const hasUrlError = Boolean(errorCode || errorDescription)
  const code = searchParams.get('code')

  useEffect(() => {
    if (loading || !supabase || hasUrlError || user || !code) return
    if (exchangeStarted.current || pkceCodesAttempted.has(code)) return
    exchangeStarted.current = true
    pkceCodesAttempted.add(code)
    void (async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        pkceCodesAttempted.delete(code)
        exchangeStarted.current = false
        setExchangeFailed(true)
        const url = new URL(window.location.href)
        url.searchParams.delete('code')
        window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
      }
    })()
  }, [loading, hasUrlError, user, code])

  if (loading) {
    return <LoadingScreen message="A validar sessão…" />
  }

  if (user && !hasUrlError) {
    return <Navigate to="/" replace />
  }

  const friendlyError = messageForAuthError(errorCode, errorDescription)

  const sendAgain = async (e: React.FormEvent) => {
    e.preventDefault()
    setResendInfo(null)
    setResendError(null)
    if (!supabase) {
      setResendError('Supabase não configurado.')
      return
    }
    const trimmed = email.trim()
    if (!trimmed) {
      setResendError('Indique o e-mail com que se registou.')
      return
    }
    setResendPending(true)
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: trimmed,
      options: { emailRedirectTo: getAuthEmailRedirectTo() },
    })
    setResendPending(false)
    if (error) setResendError(error.message)
    else
      setResendInfo(
        'Se existir um registo pendente de confirmação para este e-mail, enviámos um novo link. Verifique a caixa de entrada e o spam.'
      )
  }

  const showRecovery = hasUrlError || exchangeFailed

  return (
    <div className="flex min-h-screen bg-brand-light">
      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-6 sm:p-6 md:p-10">
        <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
          <ThemeToggle inline className="px-2" />
        </div>
        <Card className="w-full max-w-md border-border shadow-lg">
          <div className="h-1 rounded-t-lg bg-brand-orange" aria-hidden />
          <CardHeader className="pt-6">
            <CardTitle className="text-xl">Confirmação de e-mail</CardTitle>
            <CardDescription>
              {showRecovery
                ? 'O link não pôde ser utilizado.'
                : code
                  ? 'A concluir o registo…'
                  : 'Nada para processar nesta página.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {code && !showRecovery && !user && (
              <p className="text-sm text-muted-foreground">A validar o código de confirmação…</p>
            )}
            {showRecovery && (
              <>
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {hasUrlError
                    ? friendlyError
                    : 'Não foi possível validar o código. Abra o link no mesmo navegador em que criou a conta ou peça um novo e-mail de confirmação.'}
                </p>
                <form onSubmit={(e) => void sendAgain(e)} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="auth-callback-email">E-mail do registo</Label>
                    <Input
                      id="auth-callback-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(ev) => setEmail(ev.target.value)}
                      required
                    />
                  </div>
                  {resendError && <p className="text-sm text-red-800">{resendError}</p>}
                  {resendInfo && <p className="text-sm text-brand-green">{resendInfo}</p>}
                  <Button type="submit" className="w-full" disabled={resendPending}>
                    {resendPending ? 'A enviar…' : 'Reenviar e-mail de confirmação'}
                  </Button>
                </form>
                <p className="text-center text-sm text-muted-foreground">
                  <Link to="/login" className="text-brand-blue underline-offset-4 hover:underline">
                    Voltar ao início de sessão
                  </Link>
                </p>
              </>
            )}
            {!showRecovery && !code && (
              <p className="text-sm text-muted-foreground">
                <Link to="/login" className="text-brand-blue underline-offset-4 hover:underline">
                  Ir para o início de sessão
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
