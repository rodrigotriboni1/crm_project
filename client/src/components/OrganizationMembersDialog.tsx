import { useCallback, useEffect, useState } from 'react'
import { Loader2, Link2, Mail, UserPlus } from 'lucide-react'
import { listOrganizationMembers, type OrganizationMemberRow } from '@/api/organizationMembers'
import {
  buildJoinUrl,
  inviteOrAddErrorMessage,
  inviteOrAddOrganizationMember,
  listOrganizationInvitations,
  type OrganizationInviteRow,
  revokeInviteErrorMessage,
  revokeOrganizationInvitation,
  sendInviteEmailErrorMessage,
  sendOrganizationInviteEmail,
} from '@/api/organizationInvites'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  organizationName: string
  /** Só o owner vê convites, lista pendente e ações. */
  canInvite: boolean
}

function statusLabel(s: OrganizationInviteRow['status']): string {
  switch (s) {
    case 'pending':
      return 'Pendente'
    case 'accepted':
      return 'Aceite'
    case 'revoked':
      return 'Revogado'
    case 'expired':
      return 'Expirado'
    default:
      return s
  }
}

export default function OrganizationMembersDialog({
  open,
  onOpenChange,
  organizationId,
  organizationName,
  canInvite,
}: Props) {
  const [members, setMembers] = useState<OrganizationMemberRow[]>([])
  const [invites, setInvites] = useState<OrganizationInviteRow[]>([])
  const [loading, setLoading] = useState(false)
  const [invitesLoading, setInvitesLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [invitesError, setInvitesError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteOk, setInviteOk] = useState<string | null>(null)
  const [lastShareUrl, setLastShareUrl] = useState<string | null>(null)
  const [lastInviteMeta, setLastInviteMeta] = useState<{ invitationId: string; joinUrl: string } | null>(
    null
  )
  const [sendEmailBusy, setSendEmailBusy] = useState(false)
  const [sendEmailRowBusy, setSendEmailRowBusy] = useState<string | null>(null)
  const [revokeBusyId, setRevokeBusyId] = useState<string | null>(null)
  const [linkBusyEmail, setLinkBusyEmail] = useState<string | null>(null)

  const loadMembers = useCallback(async () => {
    if (!supabase || !organizationId) return
    setLoading(true)
    setListError(null)
    try {
      const rows = await listOrganizationMembers(supabase, organizationId)
      setMembers(rows)
    } catch {
      setListError('Não foi possível carregar a equipe.')
      setMembers([])
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  const loadInvites = useCallback(async () => {
    if (!supabase || !organizationId || !canInvite) return
    setInvitesLoading(true)
    setInvitesError(null)
    try {
      const rows = await listOrganizationInvitations(supabase, organizationId)
      setInvites(rows)
    } catch {
      setInvitesError('Não foi possível carregar os convites.')
      setInvites([])
    } finally {
      setInvitesLoading(false)
    }
  }, [organizationId, canInvite])

  const load = useCallback(async () => {
    await loadMembers()
    if (canInvite) await loadInvites()
  }, [loadMembers, loadInvites, canInvite])

  useEffect(() => {
    if (!open) return
    void load()
    setEmail('')
    setInviteError(null)
    setInviteOk(null)
    setLastShareUrl(null)
    setLastInviteMeta(null)
  }, [open, load])

  const onInvite = async () => {
    if (!supabase || !canInvite) return
    setInviteBusy(true)
    setInviteError(null)
    setInviteOk(null)
    setLastShareUrl(null)
    setLastInviteMeta(null)
    try {
      const r = await inviteOrAddOrganizationMember(supabase, organizationId, email)
      if (r.ok && r.mode === 'added_existing') {
        setInviteOk('Membro adicionado — já tinha conta.')
        setEmail('')
        await load()
      } else if (r.ok && r.mode === 'invited') {
        const url = buildJoinUrl(r.token)
        setLastShareUrl(url)
        setLastInviteMeta({ invitationId: r.invite_id, joinUrl: url })
        setInviteOk(
          'Convite criado. Pode enviar por e-mail (Resend) ou copiar o link. A pessoa ainda não tem conta.'
        )
        setEmail('')
        await load()
      } else {
        setInviteError(inviteOrAddErrorMessage(r.error))
      }
    } catch {
      setInviteError(inviteOrAddErrorMessage('unknown'))
    } finally {
      setInviteBusy(false)
    }
  }

  const onSendInviteEmail = async () => {
    if (!supabase || !lastInviteMeta) return
    setSendEmailBusy(true)
    setInviteError(null)
    try {
      const sent = await sendOrganizationInviteEmail(supabase, {
        invitationId: lastInviteMeta.invitationId,
        joinUrl: lastInviteMeta.joinUrl,
      })
      if (sent.ok) {
        setInviteOk('E-mail de convite enviado (verifique também spam).')
      } else {
        setInviteError(sendInviteEmailErrorMessage(sent.error))
      }
    } catch {
      setInviteError(sendInviteEmailErrorMessage('unknown'))
    } finally {
      setSendEmailBusy(false)
    }
  }

  const onSendInviteEmailForRow = async (rowEmail: string) => {
    if (!supabase || !canInvite) return
    setSendEmailRowBusy(rowEmail)
    setInviteError(null)
    try {
      const r = await inviteOrAddOrganizationMember(supabase, organizationId, rowEmail)
      if (r.ok && r.mode === 'invited') {
        const url = buildJoinUrl(r.token)
        const sent = await sendOrganizationInviteEmail(supabase, {
          invitationId: r.invite_id,
          joinUrl: url,
        })
        if (sent.ok) {
          setInviteOk(`E-mail enviado para ${rowEmail}.`)
          await loadInvites()
        } else {
          setInviteError(sendInviteEmailErrorMessage(sent.error))
          setLastShareUrl(url)
          setLastInviteMeta({ invitationId: r.invite_id, joinUrl: url })
          await loadInvites()
        }
      } else if (r.ok && r.mode === 'added_existing') {
        setInviteOk('Este e-mail já tem conta — foi adicionado como membro.')
        await load()
      } else {
        setInviteError(inviteOrAddErrorMessage(r.error))
      }
    } catch {
      setInviteError(sendInviteEmailErrorMessage('unknown'))
    } finally {
      setSendEmailRowBusy(null)
    }
  }

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setInviteOk('Link copiado para a área de transferência.')
    } catch {
      setInviteError('Não foi possível copiar. Copie manualmente.')
    }
  }

  const onRegenerateLink = async (inviteEmail: string) => {
    if (!supabase || !canInvite) return
    setLinkBusyEmail(inviteEmail)
    setInviteError(null)
    setLastShareUrl(null)
    setLastInviteMeta(null)
    try {
      const r = await inviteOrAddOrganizationMember(supabase, organizationId, inviteEmail)
      if (r.ok && r.mode === 'invited') {
        const url = buildJoinUrl(r.token)
        setLastShareUrl(url)
        setLastInviteMeta({ invitationId: r.invite_id, joinUrl: url })
        setInviteOk('Novo link gerado. Copie, partilhe ou envie por e-mail.')
        await loadInvites()
      } else if (r.ok && r.mode === 'added_existing') {
        setInviteOk('Este e-mail já tem conta — foi adicionado como membro.')
        await load()
      } else {
        setInviteError(inviteOrAddErrorMessage(r.error))
      }
    } catch {
      setInviteError(inviteOrAddErrorMessage('unknown'))
    } finally {
      setLinkBusyEmail(null)
    }
  }

  const onRevoke = async (id: string) => {
    if (!supabase || !canInvite) return
    setRevokeBusyId(id)
    setInviteError(null)
    try {
      const r = await revokeOrganizationInvitation(supabase, id)
      if (r.ok) {
        setInviteOk('Convite revogado.')
        await loadInvites()
      } else {
        setInviteError(revokeInviteErrorMessage(r.error))
      }
    } catch {
      setInviteError(revokeInviteErrorMessage('unknown'))
    } finally {
      setRevokeBusyId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-8">Equipe — {organizationName}</DialogTitle>
        </DialogHeader>

        {canInvite && (
          <div className="space-y-3 border-b border-border pb-4">
            <p className="text-xs text-muted-foreground">
              Convide por e-mail: se a pessoa já tiver conta, é adicionada de imediato; caso contrário é criado um
              convite com link para criar conta. Com Resend configurado no Supabase, pode enviar o convite
              automaticamente.
            </p>
            <div className="space-y-2">
              <Label htmlFor="invite-email">E-mail</Label>
              <div className="flex gap-2">
                <Input
                  id="invite-email"
                  type="email"
                  autoComplete="email"
                  placeholder="nome@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={inviteBusy}
                />
                <Button
                  type="button"
                  className="shrink-0 gap-1"
                  disabled={inviteBusy || !email.trim()}
                  onClick={() => void onInvite()}
                >
                  {inviteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  Convidar
                </Button>
              </div>
            </div>
            {lastShareUrl && (
              <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3">
                <p className="text-xs font-medium text-foreground">Link do convite</p>
                <p className="break-all font-mono text-[11px] text-muted-foreground">{lastShareUrl}</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="gap-1"
                    onClick={() => void copyText(lastShareUrl)}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Copiar link
                  </Button>
                  {lastInviteMeta && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="gap-1"
                      disabled={sendEmailBusy}
                      onClick={() => void onSendInviteEmail()}
                    >
                      {sendEmailBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Mail className="h-3.5 w-3.5" />
                      )}
                      Enviar por e-mail
                    </Button>
                  )}
                </div>
              </div>
            )}
            {inviteError && <p className="text-sm text-red-600">{inviteError}</p>}
            {inviteOk && <p className="text-sm text-green-700">{inviteOk}</p>}
          </div>
        )}

        {canInvite && (
          <div className="space-y-2 border-b border-border pb-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Convites</p>
            {invitesLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                A carregar…
              </div>
            )}
            {invitesError && <p className="text-sm text-red-600">{invitesError}</p>}
            {!invitesLoading && !invitesError && invites.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem convites registados.</p>
            )}
            <ul className="max-h-40 space-y-2 overflow-y-auto text-sm">
              {invites.map((inv) => (
                <li
                  key={inv.id}
                  className="flex flex-col gap-2 rounded-md border border-border bg-card px-3 py-2"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-brand-dark">{inv.email}</span>
                    <span className="text-[11px] uppercase text-brand-mid">{statusLabel(inv.status)}</span>
                    {inv.invited_by_email && (
                      <span className="text-xs text-muted-foreground">Por {inv.invited_by_email}</span>
                    )}
                  </div>
                  {(inv.status === 'pending' || inv.status === 'expired') && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="gap-1"
                        disabled={linkBusyEmail === inv.email}
                        onClick={() => void onRegenerateLink(inv.email)}
                      >
                        {linkBusyEmail === inv.email ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Link2 className="h-3.5 w-3.5" />
                        )}
                        {inv.status === 'expired' ? 'Novo link' : 'Gerar / copiar link'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        disabled={sendEmailRowBusy === inv.email || linkBusyEmail === inv.email}
                        onClick={() => void onSendInviteEmailForRow(inv.email)}
                      >
                        {sendEmailRowBusy === inv.email ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Mail className="h-3.5 w-3.5" />
                        )}
                        Enviar e-mail
                      </Button>
                      {inv.status === 'pending' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={revokeBusyId === inv.id}
                          onClick={() => void onRevoke(inv.id)}
                        >
                          {revokeBusyId === inv.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Revogar'}
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-muted-foreground">
              O token do link só aparece ao convidar ou ao gerar um novo link. «Enviar e-mail» gera um link novo e envia
              via Resend (se configurado). Convites expiram ao fim de 14 dias.
            </p>
          </div>
        )}

        <div className="space-y-2 pt-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Membros</p>
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              A carregar…
            </div>
          )}
          {listError && <p className="text-sm text-red-600">{listError}</p>}
          {!loading && !listError && members.length === 0 && (
            <p className="text-sm text-muted-foreground">Sem membros listados.</p>
          )}
          <ul className="space-y-2 text-sm">
            {members.map((m) => (
              <li
                key={m.user_id}
                className="flex flex-col rounded-md border border-border bg-card px-3 py-2"
              >
                <span className="font-medium text-brand-dark">
                  {m.full_name?.trim() || m.email || m.user_id.slice(0, 8) + '…'}
                </span>
                {m.email && <span className="text-xs text-muted-foreground">{m.email}</span>}
                <span className="mt-1 text-[11px] uppercase text-brand-mid">
                  {m.role === 'owner' ? 'Proprietário' : 'Membro'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  )
}
