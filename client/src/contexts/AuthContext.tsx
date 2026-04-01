import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getAuthEmailRedirectTo } from '@/lib/authRedirect'
import { supabase } from '@/lib/supabase'

export type SignUpOptions = {
  /** Enviado em `raw_user_meta_data` (ex.: convite à organização). */
  data?: Record<string, string>
}

type AuthCtx = {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (
    email: string,
    password: string,
    opts?: SignUpOptions
  ) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    void supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      setLoading(false)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: new Error('Supabase não configurado') }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }

  const signUp = async (email: string, password: string, opts?: SignUpOptions) => {
    if (!supabase) return { error: new Error('Supabase não configurado') }
    const emailRedirectTo =
      typeof window !== 'undefined' ? getAuthEmailRedirectTo() : undefined
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        ...(opts?.data ? { data: opts.data } : {}),
        ...(emailRedirectTo ? { emailRedirectTo } : {}),
      },
    })
    return { error: error as Error | null }
  }

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut()
  }

  return (
    <Ctx.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth must be used within AuthProvider')
  return c
}
