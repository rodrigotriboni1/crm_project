import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type OrgRow = {
  id: string
  name: string
  status: string
  plan_tier: string
  seat_limit: number
  member_count: number
  created_at: string
}

function buildJoinUrl(token: string): string {
  const base = (import.meta.env.VITE_CRM_PUBLIC_URL ?? '').replace(/\/$/, '')
  const origin =
    base ||
    (typeof window !== 'undefined' ? window.location.origin.replace(/\/$/, '') : 'http://localhost:5173')
  const u = new URL('/join', origin)
  u.searchParams.set('token', token)
  return u.toString()
}

export default function DashboardPage() {
  const nav = useNavigate()
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [orgs, setOrgs] = useState<OrgRow[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const [newName, setNewName] = useState('')
  const [newOwnerEmail, setNewOwnerEmail] = useState('')

  const [inviteOrgId, setInviteOrgId] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')

  const load = useCallback(async () => {
    if (!supabase) return
    setErr(null)
    const { data: flag, error: e1 } = await supabase.rpc('is_platform_admin')
    if (e1) {
      setErr(e1.message)
      setAllowed(false)
      setLoading(false)
      return
    }
    const isAdmin = flag === true
    setAllowed(isAdmin)
    if (!isAdmin) {
      setLoading(false)
      return
    }
    const { data: list, error: e2 } = await supabase.rpc('admin_list_organizations')
    if (e2) {
      setErr(e2.message)
      setOrgs([])
    } else {
      const raw = list as unknown
      let rows: OrgRow[] = []
      if (Array.isArray(raw)) rows = raw as OrgRow[]
      else if (typeof raw === 'string') {
        try {
          const p = JSON.parse(raw) as unknown
          if (Array.isArray(p)) rows = p as OrgRow[]
        } catch {
          rows = []
        }
      }
      setOrgs(rows)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        nav('/login', { replace: true })
        return
      }
      void load()
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) nav('/login', { replace: true })
    })
    return () => subscription.unsubscribe()
  }, [load, nav])

  const signOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    nav('/login', { replace: true })
  }

  const createOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setMsg(null)
    setErr(null)
    const { data, error } = await supabase.rpc('admin_create_organization', {
      p_name: newName.trim() || 'Empresa',
      p_initial_owner_email: newOwnerEmail.trim() || null,
    })
    if (error) {
      setErr(error.message)
      return
    }
    const j = data as {
      ok?: boolean
      organization_id?: string
      token?: string
      mode?: string
      error?: string
    }
    if (j?.ok && j.token) {
      setMsg(`Convite criado. Link: ${buildJoinUrl(j.token)}`)
    } else if (j?.ok && j.organization_id) {
      setMsg(`Organização criada (${j.organization_id}). Adicione membros por convite abaixo.`)
    } else {
      setErr(j?.error ?? 'Falha ao criar')
    }
    setNewName('')
    setNewOwnerEmail('')
    void load()
  }

  const setStatus = async (orgId: string, status: string) => {
    if (!supabase) return
    setErr(null)
    const { data, error } = await supabase.rpc('admin_set_organization_status', {
      p_organization_id: orgId,
      p_status: status,
    })
    if (error) {
      setErr(error.message)
      return
    }
    const j = data as { ok?: boolean }
    if (!j?.ok) setErr('Não foi possível actualizar o estado.')
    void load()
  }

  const platformInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase || !inviteOrgId.trim() || !inviteEmail.trim()) return
    setErr(null)
    setMsg(null)
    const { data, error } = await supabase.rpc('platform_invite_organization_member', {
      p_organization_id: inviteOrgId.trim(),
      p_email: inviteEmail.trim(),
    })
    if (error) {
      setErr(error.message)
      return
    }
    const j = data as { ok?: boolean; token?: string; mode?: string; error?: string }
    if (j?.ok && j.mode === 'invited' && j.token) {
      setMsg(`Convite: ${buildJoinUrl(j.token)}`)
    } else if (j?.ok && j.mode === 'added_existing') {
      setMsg('Utilizador já existia e foi adicionado à organização.')
    } else {
      setErr(j?.error ?? 'Convite falhou')
    }
    setInviteEmail('')
    void load()
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem' }}>
        <p className="muted">A carregar…</p>
      </div>
    )
  }

  if (allowed === false) {
    return (
      <div style={{ padding: '2rem', maxWidth: 520 }}>
        <h1>Sem acesso</h1>
        <p className="muted">Esta conta não está em platform_admins.</p>
        <button type="button" onClick={() => void signOut()} style={{ marginTop: '1rem' }}>
          Sair
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.35rem' }}>EmbalaFlow — Consola admin</h1>
          <p className="muted" style={{ margin: '0.35rem 0 0' }}>
            Criar empresas, convites e estado da conta.
          </p>
        </div>
        <button type="button" onClick={() => void signOut()}>
          Sair
        </button>
      </header>

      {err && <p className="err" style={{ marginTop: '1rem' }}>{err}</p>}
      {msg && <p className="ok" style={{ marginTop: '1rem' }}>{msg}</p>}

      <section className="card" style={{ marginTop: '1.5rem' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>Nova empresa</h2>
        <form onSubmit={(e) => void createOrg(e)}>
          <div className="row">
            <div>
              <label htmlFor="oname" style={{ display: 'block', fontSize: '0.8rem' }}>
                Nome
              </label>
              <input
                id="oname"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome da empresa"
                style={{ minWidth: 220, padding: '0.45rem 0.6rem', borderRadius: 6, border: '1px solid #ccc' }}
              />
            </div>
            <div>
              <label htmlFor="oemail" style={{ display: 'block', fontSize: '0.8rem' }}>
                E-mail do owner (opcional)
              </label>
              <input
                id="oemail"
                type="email"
                value={newOwnerEmail}
                onChange={(e) => setNewOwnerEmail(e.target.value)}
                placeholder="owner@empresa.com"
                style={{ minWidth: 240, padding: '0.45rem 0.6rem', borderRadius: 6, border: '1px solid #ccc' }}
              />
            </div>
            <button type="submit" style={{ padding: '0.5rem 1rem', borderRadius: 6, border: 'none', background: '#c45c26', color: '#fff' }}>
              Criar
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>Convite por empresa (membro)</h2>
        <form onSubmit={(e) => void platformInvite(e)}>
          <div className="row">
            <div>
              <label htmlFor="oid" style={{ display: 'block', fontSize: '0.8rem' }}>
                ID da organização (UUID)
              </label>
              <input
                id="oid"
                value={inviteOrgId}
                onChange={(e) => setInviteOrgId(e.target.value)}
                placeholder="uuid"
                style={{ minWidth: 280, padding: '0.45rem 0.6rem', borderRadius: 6, border: '1px solid #ccc' }}
              />
            </div>
            <div>
              <label htmlFor="iem" style={{ display: 'block', fontSize: '0.8rem' }}>
                E-mail
              </label>
              <input
                id="iem"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                style={{ minWidth: 220, padding: '0.45rem 0.6rem', borderRadius: 6, border: '1px solid #ccc' }}
              />
            </div>
            <button type="submit" style={{ padding: '0.5rem 1rem', borderRadius: 6, border: '1px solid #c45c26', background: '#fff', color: '#c45c26' }}>
              Enviar convite
            </button>
          </div>
        </form>
      </section>

      <section style={{ marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1.05rem' }}>Empresas</h2>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Estado</th>
                <th>Plano</th>
                <th>Membros / limite</th>
                <th>Criada</th>
                <th>Acções</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => (
                <tr key={o.id}>
                  <td>
                    <strong>{o.name}</strong>
                    <div className="muted" style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
                      {o.id}
                    </div>
                  </td>
                  <td>{o.status}</td>
                  <td>{o.plan_tier}</td>
                  <td>
                    {o.member_count} / {o.seat_limit}
                  </td>
                  <td>{o.created_at ? new Date(o.created_at).toLocaleString() : '—'}</td>
                  <td>
                    {o.status !== 'suspended' ? (
                      <button type="button" onClick={() => void setStatus(o.id, 'suspended')}>
                        Suspender
                      </button>
                    ) : (
                      <button type="button" onClick={() => void setStatus(o.id, 'active')}>
                        Reactivar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orgs.length === 0 && <p className="muted" style={{ marginTop: '1rem' }}>Nenhuma empresa.</p>}
        </div>
      </section>
    </div>
  )
}
