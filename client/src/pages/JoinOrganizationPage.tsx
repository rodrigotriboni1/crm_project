import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { previewInviteErrorMessage, previewOrganizationInvitation } from '@/api/organizationInvites'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import LoadingScreen from '@/components/LoadingScreen'
import ThemeToggle from '@/components/ThemeToggle'
import { mapAuthErrorForUser } from '@/lib/supabaseAuthErrors'
import { cnAlertError, cnAlertInfo } from '@/lib/supabaseDataErrors'

export default function JoinOrganizationPage() {
  const { user, loading, signUp } = useAuth()
  const [searchParams] = useSearchParams()
  const token = useMemo(() => (searchParams.get('token') ?? '').trim(), [searchParams])

  const [previewLoading, setPreviewLoading] = useState(true)
  const [orgName, setOrgName] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [previewError, setPreviewError] = useState<string | null>(null)

  const [password, setPassword] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!supabase || !token) {
      setPreviewLoading(false)
      if (!token) setPreviewError(previewInviteErrorMessage('invalid_token'))
      return
    }
    let cancelled = false
    void (async () => {
      setPreviewLoading(true)
      setPreviewError(null)
      const r = await previewOrganizationInvitation(supabase, token)
      if (cancelled) return
      if (r.ok) {
        setOrgName(r.organization_name)
        setInviteEmail(r.email)
      } else {
        setPreviewError(previewInviteErrorMessage(r.error))
        setOrgName(null)
        setInviteEmail('')
      }
      setPreviewLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  if (loading) {
    return <LoadingScreen message="Verificando sessão…" />
  }
  if (user) {
    return <Navigate to="/" replace />
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setSubmitError(null)
    setInfo(null)
    setPending(true)
    const { error: err } = await signUp(inviteEmail, password, {
      data: { invite_token: token },
    })
    setPending(false)
    if (err) setSubmitError(mapAuthErrorForUser(err, 'signup'))
    else
      setInfo(
        'Conta criada. Se a confirmação por e-mail estiver ativa no Supabase, confirme e depois inicie sessão — ficará na organização indicada no convite.'
      )
  }

  return (
    <div className="flex min-h-screen bg-brand-light">
      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-6 sm:p-6 md:p-10">
        <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
          <ThemeToggle inline className="px-2" />
        </div>
        <Card className="w-full max-w-md border-border shadow-lg">
          <div className="h-1 rounded-t-lg bg-brand-orange" aria-hidden />
          <CardHeader className="pt-6">
            <CardTitle className="text-xl">Entrar na equipe</CardTitle>
            <CardDescription>
              Convite para a organização no CRM. Use o mesmo e-mail indicado no convite.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {previewLoading && <p className="text-sm text-muted-foreground">A validar convite…</p>}
            {!previewLoading && previewError && <p className={cnAlertError}>{previewError}</p>}
            {!previewLoading && !previewError && orgName && (
              <p className="rounded-md border border-brand-surface bg-brand-surface/40 px-3 py-2 text-sm text-brand-dark">
                Organização: <span className="font-medium">{orgName}</span>
              </p>
            )}
            {!previewLoading && !previewError && token && (
              <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
                <div className="space-y-2">
                  <Label htmlFor="join-email">E-mail (do convite)</Label>
                  <Input
                    id="join-email"
                    type="email"
                    autoComplete="email"
                    readOnly
                    className="bg-muted/50"
                    value={inviteEmail}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    O e-mail é o do convite. Se precisar de outro endereço, peça um novo convite ao proprietário.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="join-password">Senha</Label>
                  <Input
                    id="join-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                {submitError && <p className={cnAlertError}>{submitError}</p>}
                {info && <p className={cnAlertInfo}>{info}</p>}
                <Button type="submit" className="w-full" disabled={pending || previewLoading || !!previewError}>
                  {pending ? 'Aguarde…' : 'Criar conta e aceitar convite'}
                </Button>
              </form>
            )}
            <p className="text-center text-sm text-brand-mid">
              <Link to="/login" className="text-brand-blue underline-offset-4 hover:underline">
                Já tenho conta — iniciar sessão
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
