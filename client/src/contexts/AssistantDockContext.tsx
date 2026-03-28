import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useLocation } from 'react-router-dom'
import type { AssistantVariant } from '@/lib/assistantVariants'

export type AssistantDockPageConfig = {
  variant: AssistantVariant
  contextJson: string
}

type Ctx = {
  pageConfig: AssistantDockPageConfig | null
  setPageConfig: (c: AssistantDockPageConfig | null) => void
}

const AssistantDockContext = createContext<Ctx | null>(null)

export function AssistantDockProvider({ children }: { children: ReactNode }) {
  const [pageConfig, setPageConfigState] = useState<AssistantDockPageConfig | null>(null)

  const setPageConfig = useCallback((c: AssistantDockPageConfig | null) => {
    setPageConfigState(c)
  }, [])

  const value = useMemo(() => ({ pageConfig, setPageConfig }), [pageConfig, setPageConfig])

  return <AssistantDockContext.Provider value={value}>{children}</AssistantDockContext.Provider>
}

export function useAssistantDock() {
  const ctx = useContext(AssistantDockContext)
  if (!ctx) throw new Error('useAssistantDock outside AssistantDockProvider')
  return ctx
}

/**
 * Regista o snapshot/contexto da IA para a rota atual. Limpar ao desmontar.
 */
export function useRegisterAssistantDock(variant: AssistantVariant, contextJson: string) {
  const { setPageConfig } = useAssistantDock()
  useEffect(() => {
    setPageConfig({ variant, contextJson })
    return () => setPageConfig(null)
  }, [setPageConfig, variant, contextJson])
}

/**
 * Contexto mínimo para telas sem snapshot dedicado (listagens, detalhe, etc.).
 */
export function useGenericAssistantDock(tela?: string) {
  const { pathname } = useLocation()
  const contextJson = useMemo(
    () => JSON.stringify({ rota: pathname, tela: tela ?? null }),
    [pathname, tela]
  )
  useRegisterAssistantDock('generic', contextJson)
}
