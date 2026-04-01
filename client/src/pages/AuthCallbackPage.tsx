import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { parseAuthRedirectFailure } from '@/lib/authRedirectErrors'
import LoadingScreen from '@/components/LoadingScreen'

export default function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const failure = parseAuthRedirectFailure()
    if (failure) {
      navigate('/login', { replace: true, state: { authNotice: failure } })
      return
    }

    if (!supabase) {
      navigate('/login', { replace: true })
      return
    }

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/', { replace: true })
      } else {
        navigate('/login', { replace: true })
      }
    })
  }, [navigate])

  return <LoadingScreen message="A concluir autenticação…" />
}
