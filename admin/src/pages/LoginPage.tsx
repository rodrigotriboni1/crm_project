import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setErr(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setLoading(false)
    if (error) {
      setErr(error.message)
      return
    }
    nav('/', { replace: true })
  }

  return (
    <div style={{ maxWidth: 400, margin: '3rem auto', padding: '0 1rem' }}>
      <h1 style={{ fontSize: '1.35rem' }}>Iniciar sessão — Admin</h1>
      <p className="muted">Utilizador com entrada em platform_admins na base de dados.</p>
      <form onSubmit={(e) => void onSubmit(e)} className="card" style={{ marginTop: '1.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="email" style={{ display: 'block', fontSize: '0.85rem', marginBottom: 4 }}>
            E-mail
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: 6, border: '1px solid #ccc' }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="pw" style={{ display: 'block', fontSize: '0.85rem', marginBottom: 4 }}>
            Palavra-passe
          </label>
          <input
            id="pw"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: 6, border: '1px solid #ccc' }}
          />
        </div>
        {err && <p className="err">{err}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: '0.5rem',
            padding: '0.55rem 1rem',
            borderRadius: 6,
            border: 'none',
            background: '#c45c26',
            color: '#fff',
            fontWeight: 600,
          }}
        >
          {loading ? 'A entrar…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
