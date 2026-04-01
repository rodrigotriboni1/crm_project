import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import type { AuthRedirectFailure } from '@/lib/authRedirectErrors'
import { parseAuthRedirectFailure } from '@/lib/authRedirectErrors'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UiComponent } from '@/components/standards'
import type { FieldDefinition } from '@/types'
import LoadingScreen from '@/components/LoadingScreen'
import ThemeToggle from '@/components/ThemeToggle'
import { mapAuthErrorForUser } from '@/lib/supabaseAuthErrors'
import { cnAlertError, cnAlertInfo, cnAlertWarning } from '@/lib/supabaseDataErrors'

const loginEmailField: FieldDefinition = {
  id: 'login-email',
  kind: 'email',
  label: 'E-mail',
}

const loginPasswordField: FieldDefinition = {
  id: 'login-password',
  kind: 'password',
  label: 'Senha',
}

function authNoticeMessage(n: AuthRedirectFailure): string {
  if (n.kind === 'expired_link') {
    return 'Este link de confirmação expirou ou já foi usado. Tente criar a conta de novo com o mesmo e-mail ou, se já tiver confirmado, inicie sessão.'
  }
  return n.message
}

export default function LoginPage() {
  const { user, loading, signIn, signUp } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [authNotice, setAuthNotice] = useState<AuthRedirectFailure | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    const st = (location.state as { authNotice?: AuthRedirectFailure } | null)?.authNotice
    if (st) {
      setAuthNotice(st)
      navigate(location.pathname, { replace: true, state: null })
      return
    }
    if (!location.search && !location.hash) return
    const fromUrl = parseAuthRedirectFailure()
    if (fromUrl) {
      setAuthNotice(fromUrl)
      navigate('/login', { replace: true })
    }
  }, [location.pathname, location.search, location.hash, location.state, navigate])

  if (loading) {
    return <LoadingScreen message="Verificando sessão…" />
  }
  if (user) return <Navigate to="/" replace />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setPending(true)
    const fn = mode === 'login' ? signIn : signUp
    const { error: err } = await fn(email, password)
    setPending(false)
    if (err) setError(mapAuthErrorForUser(err, mode === 'login' ? 'login' : 'signup'))
    else if (mode === 'signup')
      setInfo('Se a confirmação por e-mail estiver ativa no Supabase, verifique a caixa de entrada.')
  }

  return (
    <div className="flex min-h-screen bg-brand-light">
      <div className="relative hidden w-[42%] shrink-0 flex-col justify-between bg-[#141413] p-10 text-[#faf9f5] lg:flex">
        <div>
          <p className="font-sans text-sm font-medium uppercase tracking-[0.2em] text-brand-orange">EmbalaFlow</p>
          <h1 className="mt-6 max-w-sm font-sans text-3xl font-semibold leading-tight tracking-tight">
            Relacione clientes e orçamentos com clareza.
          </h1>
          <p className="mt-4 max-w-sm font-serif text-sm leading-relaxed text-[#b0aea5]">
            Interface pensada para o dia a dia comercial em embalagens — sem ruído visual.
          </p>
        </div>
        <p className="font-serif text-xs text-[#b0aea5]/90">Acesso seguro via Supabase Auth.</p>
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23faf9f5' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
          aria-hidden
        />
      </div>
      <div className="relative flex flex-1 items-center justify-center px-4 py-6 sm:p-6 md:p-10">
        <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
          <ThemeToggle inline className="px-2" />
        </div>
        <Card className="w-full max-w-md border-border shadow-lg">
          <div className="h-1 rounded-t-lg bg-brand-orange" aria-hidden />
          <CardHeader className="pt-6">
            <CardTitle className="text-xl">Entrar</CardTitle>
            <CardDescription>E-mail e senha (Supabase).</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-5">
              <UiComponent
                field={{ ...loginEmailField, autoComplete: 'email' }}
                value={email}
                onChange={setEmail}
                htmlId="email"
                required
                className="space-y-2"
              />
              <UiComponent
                field={{
                  ...loginPasswordField,
                  autoComplete: mode === 'login' ? 'current-password' : 'new-password',
                }}
                value={password}
                onChange={setPassword}
                htmlId="password"
                required
                minLength={6}
                className="space-y-2"
              />
              {error && <p className={cnAlertError}>{error}</p>}
              {authNotice && <p className={cnAlertWarning}>{authNoticeMessage(authNotice)}</p>}
              {info && <p className={cnAlertInfo}>{info}</p>}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
              </Button>
              <button
                type="button"
                className="text-center font-sans text-sm text-brand-blue underline-offset-4 hover:underline"
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login')
                  setError(null)
                  setInfo(null)
                }}
              >
                {mode === 'login' ? 'Criar conta' : 'Já tenho conta'}
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
