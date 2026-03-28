import { useState, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { useApplyOrcamentoUpdate } from '@/hooks/useCrm'
import type { OrcamentoRow } from '@/api/crm'
import type { OrcamentoStatus } from '@/types/database'

/**
 * Mudança de status inline (tabela/Kanban) com regra Dormindo + diálogo de follow-up.
 */
export function useOrcamentoStatusTransitions(user: User | null) {
  const apply = useApplyOrcamentoUpdate(user)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [moveError, setMoveError] = useState<string | null>(null)
  const [pendingDormindo, setPendingDormindo] = useState<OrcamentoRow | null>(null)
  const [dormindoDialogError, setDormindoDialogError] = useState<string | null>(null)
  const [pendingPerdido, setPendingPerdido] = useState<OrcamentoRow | null>(null)
  const [perdidoDialogError, setPerdidoDialogError] = useState<string | null>(null)

  const executeMove = useCallback(
    async (
      o: OrcamentoRow,
      newStatus: OrcamentoStatus,
      followUpAt: string | null,
      lostReason?: string | null
    ) => {
      setSavingId(o.id)
      setMoveError(null)
      try {
        await apply.mutateAsync({
          orcamentoId: o.id,
          clienteId: o.cliente_id,
          status: newStatus,
          followUpAt,
          note: null,
          lostReason: newStatus === 'perdido' ? lostReason : undefined,
        })
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        setMoveError(msg)
        throw e
      } finally {
        setSavingId(null)
      }
    },
    [apply]
  )

  const attemptStatusChange = useCallback(
    (o: OrcamentoRow, newStatus: OrcamentoStatus) => {
      if (newStatus === o.status) return
      if (newStatus === 'dormindo' && !o.follow_up_at) {
        setMoveError(null)
        setDormindoDialogError(null)
        setPendingDormindo(o)
        return
      }
      if (newStatus === 'perdido') {
        setMoveError(null)
        setPerdidoDialogError(null)
        setPendingPerdido(o)
        return
      }
      const fu = o.follow_up_at?.slice(0, 10) ?? null
      void executeMove(o, newStatus, fu).catch(() => {
        /* erro já em moveError */
      })
    },
    [executeMove]
  )

  const confirmDormindo = useCallback(
    async (date: string) => {
      if (!pendingDormindo) return
      setDormindoDialogError(null)
      try {
        await executeMove(pendingDormindo, 'dormindo', date)
        setPendingDormindo(null)
      } catch (e) {
        setMoveError(null)
        setDormindoDialogError(e instanceof Error ? e.message : 'Falha ao salvar.')
      }
    },
    [pendingDormindo, executeMove]
  )

  const onDormindoDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setPendingDormindo(null)
      setDormindoDialogError(null)
    }
  }, [])

  const confirmPerdido = useCallback(
    async (lostReason: string | null) => {
      if (!pendingPerdido) return
      setPerdidoDialogError(null)
      const fu = pendingPerdido.follow_up_at?.slice(0, 10) ?? null
      try {
        await executeMove(pendingPerdido, 'perdido', fu, lostReason)
        setPendingPerdido(null)
      } catch (e) {
        setMoveError(null)
        setPerdidoDialogError(e instanceof Error ? e.message : 'Falha ao salvar.')
      }
    },
    [pendingPerdido, executeMove]
  )

  const onPerdidoDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setPendingPerdido(null)
      setPerdidoDialogError(null)
    }
  }, [])

  return {
    savingId,
    moveError,
    setMoveError,
    pendingDormindo,
    dormindoDialogError,
    pendingPerdido,
    perdidoDialogError,
    attemptStatusChange,
    confirmDormindo,
    onDormindoDialogOpenChange,
    confirmPerdido,
    onPerdidoDialogOpenChange,
  }
}
