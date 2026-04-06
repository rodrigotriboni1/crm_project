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
  /** Incrementado pelo painel ("Actualizar referência") para forçar páginas a recalcular o snapshot. */
  contextRefreshNonce: number
  refreshAssistantContext: () => void
}

const AssistantDockContext = createContext<Ctx | null>(null)

export function AssistantDockProvider({ children }: { children: ReactNode }) {
  const [pageConfig, setPageConfigState] = useState<AssistantDockPageConfig | null>(null)
  const [contextRefreshNonce, setContextRefreshNonce] = useState(0)

  const setPageConfig = useCallback((c: AssistantDockPageConfig | null) => {
    setPageConfigState(c)
  }, [])

  const refreshAssistantContext = useCallback(() => {
    setContextRefreshNonce((n) => n + 1)
  }, [])

  const value = useMemo(
    () => ({ pageConfig, setPageConfig, contextRefreshNonce, refreshAssistantContext }),
    [pageConfig, setPageConfig, contextRefreshNonce, refreshAssistantContext]
  )

  return <AssistantDockContext.Provider value={value}>{children}</AssistantDockContext.Provider>
}

export function useAssistantDock() {
  const ctx = useContext(AssistantDockContext)
  if (!ctx) throw new Error('useAssistantDock outside AssistantDockProvider')
  return ctx
}

/** Para componentes que podem estar fora do provider (ex. modais). */
export function useAssistantDockOptional(): Ctx | null {
  return useContext(AssistantDockContext)
}

/**
 * Expõe o nonce de refresh; inclua `contextRefreshNonce` nas dependências do `useMemo` que monta `contextJson`.
 */
export function useAssistantContextRefresh() {
  const { contextRefreshNonce, refreshAssistantContext } = useAssistantDock()
  return { contextRefreshNonce, refreshAssistantContext }
}

/**
 * Regista o snapshot/contexto da IA para a rota actual. Limpar ao desmontar.
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
