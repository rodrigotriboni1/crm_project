import { useCallback, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { FileSpreadsheet, Loader2, Sparkles } from 'lucide-react'
import { isAssistantConfigured } from '@/api/openrouter'
import { useOrganization } from '@/contexts/OrganizationContext'
import { useClienteImportJob } from '@/contexts/ClienteImportJobContext'
import { suggestClienteColumnMapping } from '@/lib/clienteImportAi'
import {
  buildMappingFromAi,
  importTargetOptions,
  nonEmptySampleRows,
  parseExcelFile,
  rowToClientePayload,
  type ColumnMapping,
  type ParsedSheet,
} from '@/lib/importClientesExcel'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SelectNative } from '@/components/ui/select-native'
import type { ImportJobRowError } from '@/contexts/ClienteImportJobContext'

type Props = {
  user: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function initialMapping(headers: string[]): ColumnMapping {
  const m: ColumnMapping = {}
  for (const h of headers) m[h] = ''
  return m
}

export default function ImportarClientesDialog({ user, open, onOpenChange }: Props) {
  const { activeOrganizationId } = useOrganization()
  const { phase: importPhase, runImport } = useClienteImportJob()
  const [file, setFile] = useState<File | null>(null)
  const [sheets, setSheets] = useState<ParsedSheet[]>([])
  const [sheetIndex, setSheetIndex] = useState(0)
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiWarnings, setAiWarnings] = useState<string[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [localImportHint, setLocalImportHint] = useState<string | null>(null)

  const active = sheets[sheetIndex]
  const headers = active?.headers ?? []
  const rows = active?.rows ?? []
  const sample = useMemo(
    () => nonEmptySampleRows(rows, headers.length, 10),
    [rows, headers.length]
  )
  const previewRows = useMemo(
    () => nonEmptySampleRows(rows, headers.length, 8),
    [rows, headers.length]
  )

  const configured = isAssistantConfigured(user)
  const importRunning = importPhase === 'running'

  const reset = useCallback(() => {
    setFile(null)
    setSheets([])
    setSheetIndex(0)
    setMapping({})
    setAiLoading(false)
    setAiError(null)
    setAiWarnings([])
    setParseError(null)
    setLocalImportHint(null)
  }, [])

  const onFile = async (f: File | null) => {
    setParseError(null)
    setLocalImportHint(null)
    setFile(f)
    if (!f) {
      setSheets([])
      setMapping({})
      return
    }
    try {
      const parsed = await parseExcelFile(f)
      if (!parsed.length) {
        setParseError('Nenhuma folha com dados encontrada.')
        setSheets([])
        setMapping({})
        return
      }
      setSheets(parsed)
      setSheetIndex(0)
      setMapping(initialMapping(parsed[0].headers))
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Não foi possível ler o ficheiro.')
      setSheets([])
      setMapping({})
    }
  }

  const onSheetChange = (idx: number) => {
    setSheetIndex(idx)
    const sh = sheets[idx]
    if (sh) setMapping(initialMapping(sh.headers))
    setAiWarnings([])
    setLocalImportHint(null)
  }

  const setFieldForHeader = (header: string, field: string) => {
    setMapping((prev) => ({ ...prev, [header]: field as ColumnMapping[string] }))
    setLocalImportHint(null)
  }

  const runAi = async () => {
    if (!active || !configured) return
    setAiError(null)
    setAiWarnings([])
    setAiLoading(true)
    try {
      const { mapping: m, warnings } = await suggestClienteColumnMapping(active.headers, sample, {
        organizationId: activeOrganizationId ?? undefined,
      })
      setMapping(buildMappingFromAi(active.headers, m))
      setAiWarnings(warnings ?? [])
    } catch (e) {
      setAiError(e instanceof Error ? e.message : String(e))
    } finally {
      setAiLoading(false)
    }
  }

  const nomeMapped = useMemo(() => Object.values(mapping).includes('nome'), [mapping])

  const startBackgroundImport = () => {
    if (!user?.id || !active || !nomeMapped || !activeOrganizationId) return
    setLocalImportHint(null)

    const preBatchErrors: ImportJobRowError[] = []
    const jobs: { excelRow: number; json: Record<string, unknown> }[] = []
    let excelRow = 2
    for (const row of rows) {
      const cells = [...row]
      while (cells.length < headers.length) cells.push('')
      const slice = cells.slice(0, headers.length)
      if (!slice.some((c) => c.trim())) {
        excelRow++
        continue
      }
      const payload = rowToClientePayload(slice, headers, mapping)
      if (!payload) {
        preBatchErrors.push({ row: excelRow, msg: 'Sem nome na linha (mapeamento).' })
        excelRow++
        continue
      }
      jobs.push({
        excelRow,
        json: {
          nome: payload.nome,
          tipo: payload.tipo ?? 'novo',
          tax_id: payload.tax_id ?? null,
          whatsapp: payload.whatsapp ?? null,
          telefone: payload.telefone ?? null,
          produtos_habituais: payload.produtos_habituais ?? null,
          observacoes: payload.observacoes ?? null,
        },
      })
      excelRow++
    }

    if (jobs.length === 0) {
      if (preBatchErrors.length > 0) {
        setLocalImportHint(
          `Nenhuma linha válida para enviar. ${preBatchErrors.length} linha(s) sem nome — ajuste o mapeamento ou a folha.`
        )
      } else {
        setLocalImportHint('Nenhuma linha com dados para importar.')
      }
      return
    }

    runImport({
      userId: user.id,
      organizationId: activeOrganizationId,
      jobs,
      preBatchErrors: preBatchErrors.length > 0 ? preBatchErrors : undefined,
    })
    onOpenChange(false)
  }

  const targetOpts = importTargetOptions()

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar clientes (Excel)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {importRunning && (
            <p className="rounded-md border border-brand-orange/30 bg-brand-orange/10 px-3 py-2 text-xs text-brand-dark">
              Uma importação está em curso — acompanhe o progresso no aviso fixo no canto do ecrã. Pode fechar este
              diálogo.
            </p>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Ficheiro (.xlsx / .xls)</label>
            <input
              type="file"
              accept=".xlsx,.xls"
              className="block w-full text-xs file:mr-2 file:rounded file:border file:bg-muted file:px-2 file:py-1"
              onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
            />
            {file && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                {file.name}
              </p>
            )}
            {parseError && <p className="mt-1 text-xs text-red-600">{parseError}</p>}
          </div>

          {sheets.length > 1 && (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Folha</label>
              <SelectNative
                className="h-9 text-sm"
                value={String(sheetIndex)}
                onChange={(e) => onSheetChange(Number(e.target.value))}
              >
                {sheets.map((s, i) => (
                  <option key={s.sheetName} value={i}>
                    {s.sheetName}
                  </option>
                ))}
              </SelectNative>
            </div>
          )}

          {active && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!configured || aiLoading || !sample.length || importRunning}
                  onClick={() => void runAi()}
                >
                  {aiLoading ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1 h-3.5 w-3.5" />
                  )}
                  Sugerir mapeamento com IA
                </Button>
                {!configured && (
                  <span className="text-xs text-muted-foreground">Configure o assistente (OpenRouter) para usar a IA.</span>
                )}
              </div>
              {aiError && <p className="text-xs text-red-600">{aiError}</p>}
              {aiWarnings.length > 0 && (
                <ul className="list-inside list-disc text-xs text-amber-800">
                  {aiWarnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              )}

              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Mapeamento de colunas (é obrigatório mapear pelo menos <strong className="text-foreground">Nome</strong>)
                </p>
                <div className="max-h-48 space-y-2 overflow-y-auto rounded border border-border p-2">
                  {headers.map((h) => (
                    <div key={h} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                      <span className="min-w-0 flex-1 truncate font-mono text-xs" title={h}>
                        {h || '(vazio)'}
                      </span>
                      <SelectNative
                        className="h-8 flex-1 text-xs sm:max-w-[14rem]"
                        value={mapping[h] ?? ''}
                        onChange={(e) => setFieldForHeader(h, e.target.value)}
                        disabled={importRunning}
                      >
                        {targetOpts.map((o) => (
                          <option key={o.value || '_skip'} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </SelectNative>
                    </div>
                  ))}
                </div>
              </div>

              {previewRows.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Pré-visualização (primeiras linhas)</p>
                  <div className="overflow-x-auto rounded border border-border">
                    <table className="w-full min-w-[320px] border-collapse text-left text-[11px]">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          <th className="p-2 font-medium">Nome (mapeado)</th>
                          <th className="p-2 font-medium">Doc</th>
                          <th className="p-2 font-medium">Tel</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row, i) => {
                          const p = rowToClientePayload(row, headers, mapping)
                          return (
                            <tr key={i} className="border-b border-border/60">
                              <td className="p-2">{p?.nome ?? '—'}</td>
                              <td className="p-2 font-mono">{p?.tax_id ?? '—'}</td>
                              <td className="p-2 font-mono">{p?.whatsapp || p?.telefone || '—'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {localImportHint && (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  {localImportHint}
                </p>
              )}

              <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Fechar
                </Button>
                <Button
                  type="button"
                  disabled={!nomeMapped || !user || importRunning}
                  onClick={startBackgroundImport}
                >
                  Importar em segundo plano
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                O envio corre em lotes; pode fechar este diálogo e continuar a usar o CRM. O resultado aparece no aviso
                fixo.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
