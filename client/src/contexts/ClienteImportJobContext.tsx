import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { importClientesBatch } from '@/api/clientes'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'

export const IMPORT_BATCH_SIZE = 80

export type ImportJobPhase = 'idle' | 'running' | 'done' | 'error'

export type ImportJobProgress = {
  currentBatch: number
  totalBatches: number
  rowsProcessed: number
  rowsTotal: number
  insertedSoFar: number
}

export type ImportJobRowError = { row: number; msg: string }

export type ImportClienteJob = { excelRow: number; json: Record<string, unknown> }

type RunImportArgs = {
  userId: string
  organizationId: string
  jobs: ImportClienteJob[]
  /** Erros de validação local (ex.: linha sem nome) — aparecem no resumo final com os erros do servidor. */
  preBatchErrors?: ImportJobRowError[]
}

type Ctx = {
  phase: ImportJobPhase
  progress: ImportJobProgress | null
  errors: ImportJobRowError[]
  lastMessage: string | null
  runImport: (args: RunImportArgs) => void
  cancelImport: () => void
  dismissBanner: () => void
  showErrorsExpanded: boolean
  setShowErrorsExpanded: (v: boolean) => void
}

const ClienteImportJobContext = createContext<Ctx | null>(null)

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve())
  })
}

export function ClienteImportJobProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [phase, setPhase] = useState<ImportJobPhase>('idle')
  const [progress, setProgress] = useState<ImportJobProgress | null>(null)
  const [errors, setErrors] = useState<ImportJobRowError[]>([])
  const [lastMessage, setLastMessage] = useState<string | null>(null)
  const [showErrorsExpanded, setShowErrorsExpanded] = useState(false)
  const runningRef = useRef(false)
  const abortedRef = useRef(false)

  const dismissBanner = useCallback(() => {
    setPhase('idle')
    setProgress(null)
    setErrors([])
    setLastMessage(null)
    setShowErrorsExpanded(false)
  }, [])

  const cancelImport = useCallback(() => {
    abortedRef.current = true
  }, [])

  const runImport = useCallback(
    (args: RunImportArgs) => {
      const { userId, organizationId, jobs, preBatchErrors = [] } = args
      const sb = supabase
      if (!sb || jobs.length === 0) return
      if (runningRef.current) return

      runningRef.current = true
      abortedRef.current = false
      setPhase('running')
      setErrors([])
      setLastMessage(null)
      setShowErrorsExpanded(false)

      const total = jobs.length
      const totalBatches = Math.ceil(total / IMPORT_BATCH_SIZE)
      let insertedSoFar = 0
      const accErrors: ImportJobRowError[] = []

      setProgress({
        currentBatch: 0,
        totalBatches,
        rowsProcessed: 0,
        rowsTotal: total,
        insertedSoFar: 0,
      })

      const run = async () => {
        try {
          for (let b = 0; b < totalBatches; b++) {
            if (abortedRef.current) break

            const start = b * IMPORT_BATCH_SIZE
            const slice = jobs.slice(start, start + IMPORT_BATCH_SIZE)

            // Antes do RPC: barra no % já concluído (não “saltar” para o fim do lote antes da resposta).
            setProgress({
              currentBatch: b + 1,
              totalBatches,
              rowsProcessed: start,
              rowsTotal: total,
              insertedSoFar,
            })
            await yieldToUi()

            const { inserted, errors: batchErrs } = await importClientesBatch(
              sb,
              organizationId,
              slice.map((j) => j.json)
            )
            insertedSoFar += inserted
            for (const e of batchErrs) {
              const job = slice[e.index]
              if (job) accErrors.push({ row: job.excelRow, msg: e.msg })
            }

            const rowsDone = Math.min(start + slice.length, total)
            setProgress({
              currentBatch: b + 1,
              totalBatches,
              rowsProcessed: rowsDone,
              rowsTotal: total,
              insertedSoFar,
            })

            await yieldToUi()
          }

          if (abortedRef.current) {
            setPhase('idle')
            setProgress(null)
            setLastMessage('Importação cancelada.')
            runningRef.current = false
            return
          }

          void qc.invalidateQueries({ queryKey: qk.clientes(userId, organizationId) })
          void qc.invalidateQueries({ queryKey: qk.dashboard(userId, organizationId) })

          const allErrs = [...preBatchErrors, ...accErrors]
          setErrors(allErrs)
          setPhase('done')
          setLastMessage(
            allErrs.length > 0
              ? `${insertedSoFar} cliente(s) criados · ${allErrs.length} linha(s) com problema`
              : `${insertedSoFar} cliente(s) importados com sucesso`
          )
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          setErrors([{ row: 0, msg }, ...accErrors])
          setPhase('error')
          setLastMessage('Falha na importação')
        } finally {
          runningRef.current = false
        }
      }

      void run()
    },
    [qc]
  )

  const value: Ctx = {
    phase,
    progress,
    errors,
    lastMessage,
    runImport,
    cancelImport,
    dismissBanner,
    showErrorsExpanded,
    setShowErrorsExpanded,
  }

  return <ClienteImportJobContext.Provider value={value}>{children}</ClienteImportJobContext.Provider>
}

export function useClienteImportJob() {
  const ctx = useContext(ClienteImportJobContext)
  if (!ctx) throw new Error('useClienteImportJob outside ClienteImportJobProvider')
  return ctx
}
