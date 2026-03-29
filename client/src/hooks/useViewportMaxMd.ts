import { useEffect, useState } from 'react'

const QUERY = '(max-width: 767px)'

/** Viewport estreito (mobile / agente em campo) — alinhado a breakpoint `md` do Tailwind. */
export function useViewportMaxMd(): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(QUERY).matches : false
  )

  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const onChange = () => setMatches(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return matches
}
