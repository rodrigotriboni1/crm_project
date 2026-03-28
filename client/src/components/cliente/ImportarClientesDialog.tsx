import { useCallback, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { FileSpreadsheet, Loader2, Sparkles } from 'lucide-react'
import { isAssistantConfigured } from '@/api/openrouter'
import { createCliente } from '@/api/clientes'
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
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SelectNative } from '@/components/ui/select-native'
import { cn } from '@/lib/utils'

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
  const qc = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [sheets, setSheets] = useState<ParsedSheet[]>([])
  const [sheetIndex, setSheetIndex] = useState(0)
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiWarnings, setAiWarnings] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ ok: number; errors: { row: number; msg: string }[] } | null>(
    null
  )
  const [parseError, setParseError] = useState<string | null>(null)

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

  const reset = useCallback(() => {
    setFile(null)
    setSheets([])
    setSheetIndex(0)
    setMapping({})
    setAiLoading(false)
    setAiError(null)
    setAiWarnings([])
    setImporting(false)
    setImportResult(null)
    setParseError(null)
  }, [])

  const onFile = async (f: File | null) => {
    setParseError(null)
    setImportResult(null)
    setAiWarnings([])
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
    setImportResult(null)
    setAiWarnings([])
  }

  const setFieldForHeader = (header: string, field: string) => {
    setMapping((prev) => ({ ...prev, [header]: field as ColumnMapping[string] }))
  }

  const runAi = async () => {
    if (!active || !configured) return
    setAiError(null)
    setAiWarnings([])
    setAiLoading(true)
    try {
      const { mapping: m, warnings } = await suggestClienteColumnMapping(active.headers, sample)
      setMapping(buildMappingFromAi(active.headers, m))
      setAiWarnings(warnings ?? [])
    } catch (e) {
      setAiError(e instanceof Error ? e.message : String(e))
    } finally {
      setAiLoading(false)
    }
  }

  const nomeMapped = useMemo(() => Object.values(mapping).includes('nome'), [mapping])

  const runImport = async () => {
    if (!user?.id || !supabase || !active || !nomeMapped) return
    setImporting(true)
    setImportResult(null)
    const errors: { row: number; msg: string }[] = []
    let ok = 0
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
        errors.push({ row: excelRow, msg: 'Sem nome na linha (mapeamento).' })
        excelRow++
        continue
      }
      try {
        await createCliente(supabase, user.id, payload)
        ok++
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message.toLowerCase().includes('duplicate') || err.message.includes('23505')
              ? 'Documento duplicado (CPF/CNPJ já existe).'
              : err.message
            : String(err)
        errors.push({ row: excelRow, msg })
      }
      excelRow++
      await new Promise((r) => setTimeout(r, 0))
    }
    setImportResult({ ok, errors })
    setImporting(false)
    void qc.invalidateQueries({ queryKey: qk.clientes(user.id) })
    void qc.invalidateQueries({ queryKey: qk.dashboard(user.id) })
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
                  disabled={!configured || aiLoading || !sample.length}
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

              <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Fechar
                </Button>
                <Button
                  type="button"
                  disabled={!nomeMapped || importing || !user}
                  onClick={() => void runImport()}
                >
                  {importing ? (
                    <>
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      A importar…
                    </>
                  ) : (
                    'Importar todos'
                  )}
                </Button>
              </div>

              {importResult && (
                <div
                  className={cn(
                    'rounded-md border p-3 text-xs',
                    importResult.errors.length ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'
                  )}
                >
                  <p className="font-medium text-foreground">
                    {importResult.ok} cliente(s) criados
                    {importResult.errors.length > 0 && ` · ${importResult.errors.length} linha(s) com erro`}
                  </p>
                  {importResult.errors.length > 0 && (
                    <ul className="mt-2 max-h-32 list-inside list-disc overflow-y-auto text-red-800">
                      {importResult.errors.slice(0, 50).map((e, idx) => (
                        <li key={idx}>
                          Linha {e.row}: {e.msg}
                        </li>
                      ))}
                      {importResult.errors.length > 50 && (
                        <li>… e mais {importResult.errors.length - 50} erros</li>
                      )}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
