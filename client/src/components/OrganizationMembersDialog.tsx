import { useCallback, useEffect, useState } from 'react'
import { Loader2, UserPlus } from 'lucide-react'
import {
  addMemberErrorMessage,
  addOrganizationMemberByEmail,
  listOrganizationMembers,
  type OrganizationMemberRow,
} from '@/api/organizationMembers'
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
  /** Só o owner vê o formulário de convite. */
  canInvite: boolean
}

export default function OrganizationMembersDialog({
  open,
  onOpenChange,
  organizationId,
  organizationName,
  canInvite,
}: Props) {
  const [members, setMembers] = useState<OrganizationMemberRow[]>([])
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteOk, setInviteOk] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!supabase || !organizationId) return
    setLoading(true)
    setListError(null)
    try {
      const rows = await listOrganizationMembers(supabase, organizationId)
      setMembers(rows)
    } catch {
      setListError('Não foi possível carregar a equipa.')
      setMembers([])
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    if (!open) return
    void load()
    setEmail('')
    setInviteError(null)
    setInviteOk(null)
  }, [open, load])

  const onInvite = async () => {
    if (!supabase || !canInvite) return
    setInviteBusy(true)
    setInviteError(null)
    setInviteOk(null)
    try {
      const r = await addOrganizationMemberByEmail(supabase, organizationId, email)
      if (r.ok) {
        setInviteOk('Membro adicionado.')
        setEmail('')
        await load()
      } else {
        setInviteError(addMemberErrorMessage(r.error))
      }
    } catch {
      setInviteError(addMemberErrorMessage('unknown'))
    } finally {
      setInviteBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-8">Equipa — {organizationName}</DialogTitle>
        </DialogHeader>

        {canInvite && (
          <div className="space-y-3 border-b border-border pb-4">
            <p className="text-xs text-muted-foreground">
              Adicione o e-mail de uma pessoa que já tenha conta no CRM (mesmo domínio de login). Não
              enviamos convite por e-mail nesta versão.
            </p>
            <div className="space-y-2">
              <Label htmlFor="invite-email">E-mail do utilizador</Label>
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
                  Adicionar
                </Button>
              </div>
            </div>
            {inviteError && <p className="text-sm text-red-600">{inviteError}</p>}
            {inviteOk && <p className="text-sm text-green-700">{inviteOk}</p>}
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
                {m.email && (
                  <span className="text-xs text-muted-foreground">{m.email}</span>
                )}
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
