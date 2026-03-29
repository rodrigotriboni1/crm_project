import { useEffect } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useClienteImportJob } from '@/contexts/ClienteImportJobContext'
import { cn } from '@/lib/utils'

/**
 * Progresso / resultado da importação em segundo plano (não bloqueia o diálogo).
 */
export default function ImportProgressBanner() {
  const {
    phase,
    progress,
    errors,
    lastMessage,
    dismissBanner,
    cancelImport,
    showErrorsExpanded,
    setShowErrorsExpanded,
  } = useClienteImportJob()

  useEffect(() => {
    if (phase !== 'done') return
    if (errors.length > 0) return
    const t = window.setTimeout(() => dismissBanner(), 8000)
    return () => window.clearTimeout(t)
  }, [phase, errors.length, dismissBanner])

  if (phase === 'idle' && !lastMessage) return null

  if (phase === 'idle' && lastMessage) {
    return (
      <div
        className="fixed z-[60] max-w-md rounded-lg border border-border bg-sidebar/95 p-3 text-sm shadow-lg backdrop-blur-sm bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] left-4 right-4 md:bottom-4 md:left-auto md:right-4"
        role="status"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-muted-foreground">{lastMessage}</p>
          <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 px-2" onClick={dismissBanner}>
            OK
          </Button>
        </div>
      </div>
    )
  }

  const rowsTotal = progress?.rowsTotal ?? 0
  const rowsProcessed = progress?.rowsProcessed ?? 0
  const pct =
    phase === 'running' && rowsTotal > 0
      ? Math.min(100, Math.round((rowsProcessed / rowsTotal) * 100))
      : 0

  return (
    <div
      className={cn(
        'fixed z-[60] max-w-md rounded-lg border bg-card p-3 text-sm shadow-lg',
        'bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] left-4 right-4 md:bottom-4 md:left-auto md:right-4',
        phase === 'error' && 'border-red-200 bg-red-50/95 dark:border-red-900 dark:bg-red-950/40',
        phase === 'done' && errors.length === 0 && 'border-green-200 bg-green-50/95 dark:border-green-900 dark:bg-green-950/30',
        (phase === 'running' || (phase === 'done' && errors.length > 0)) &&
          'border-border bg-sidebar/95 backdrop-blur-sm'
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-2">
        {phase === 'running' && (
          <Loader2 className="mt-1 h-4 w-4 shrink-0 animate-spin text-brand-orange" aria-hidden />
        )}
        {phase === 'done' && errors.length === 0 && (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-700 dark:text-green-400" />
        )}
        {(phase === 'error' || (phase === 'done' && errors.length > 0)) && (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-500" />
        )}

        <div className="min-w-0 flex-1">
          <p className="font-medium text-brand-dark dark:text-foreground">
            {phase === 'running' ? 'A importar clientes…' : lastMessage ?? 'Importação'}
          </p>
          {phase === 'running' && (
            <>
              <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  {progress
                    ? `Lote ${progress.currentBatch}/${progress.totalBatches} · ${rowsProcessed}/${rowsTotal} linhas · ${progress.insertedSoFar} criados`
                    : 'A preparar…'}
                </span>
                <span className="shrink-0 tabular-nums font-semibold text-foreground">{pct}%</span>
              </div>
              <div
                className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progresso da importação"
              >
                <div
                  className="h-full rounded-full bg-brand-orange transition-[width] duration-300 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </>
          )}
          {phase === 'done' && errors.length > 0 && (
            <div className="mt-2">
              <button
                type="button"
                className="text-xs font-medium text-brand-orange underline-offset-2 hover:underline"
                onClick={() => setShowErrorsExpanded(!showErrorsExpanded)}
              >
                {showErrorsExpanded ? 'Ocultar erros' : `Ver ${errors.length} erro(s)`}
              </button>
              {showErrorsExpanded && (
                <ul className="mt-2 max-h-32 list-inside list-disc overflow-y-auto text-xs text-red-800 dark:text-red-300">
                  {errors.slice(0, 40).map((e, i) => (
                    <li key={i}>
                      Linha {e.row}: {e.msg}
                    </li>
                  ))}
                  {errors.length > 40 && <li>… e mais {errors.length - 40}</li>}
                </ul>
              )}
            </div>
          )}
          {phase === 'error' && errors[0] && (
            <p className="mt-1 text-xs text-red-800 dark:text-red-300">{errors[0].msg}</p>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-1">
          {phase === 'running' && (
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={cancelImport}>
              Cancelar
            </Button>
          )}
          {(phase === 'done' || phase === 'error') && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={dismissBanner}
              title="Fechar"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Fechar</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
