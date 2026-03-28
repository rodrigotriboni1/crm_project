import { useCallback, useMemo, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAuth } from '@/contexts/AuthContext'
import { ORCAMENTO_STATUS_ORDER, orcamentoStatusLabel, useReports } from '@/hooks/useCrm'
import type { ReportsDateRange } from '@/api/crm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ListPageKpiGrid } from '@/components/library/ListPageKpiGrid'
import { PageContainer } from '@/components/library/PageContainer'
import { SimpleDataTable } from '@/components/library/SimpleDataTable'
import { useRegisterAssistantDock } from '@/contexts/AssistantDockContext'
import { buildReportsAgentContext } from '@/lib/reportsAgentContext'

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function currentMonthRange(): ReportsDateRange {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const start = `${y}-${pad2(m + 1)}-01`
  const lastDay = new Date(y, m + 1, 0).getDate()
  const end = `${y}-${pad2(m + 1)}-${pad2(lastDay)}`
  return { start, end }
}

function brl(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function downloadCsv(filename: string, csv: string) {
  const bom = '\uFEFF'
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function escapeCsvCell(s: string): string {
  if (/[;"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export default function RelatoriosPage() {
  const { user } = useAuth()
  const initial = useMemo(() => currentMonthRange(), [])
  const [draftStart, setDraftStart] = useState(initial.start)
  const [draftEnd, setDraftEnd] = useState(initial.end)
  const [applied, setApplied] = useState<ReportsDateRange>(initial)

  const { data, isLoading, isError, error, isFetching } = useReports(user, applied)

  const contextJson = useMemo(() => (data ? buildReportsAgentContext(data) : '{}'), [data])
  useRegisterAssistantDock('reports', contextJson)

  const applyRange = useCallback(() => {
    if (draftStart > draftEnd) return
    setApplied({ start: draftStart, end: draftEnd })
  }, [draftStart, draftEnd])

  const exportOrcamentosCsv = useCallback(() => {
    if (!data) return
    const header = ['display_num', 'cliente', 'status', 'valor', 'data_orcamento']
    const lines = [
      header.join(';'),
      ...data.orcamentosResumo.map((r) =>
        [
          String(r.display_num),
          escapeCsvCell(r.clienteNome),
          escapeCsvCell(orcamentoStatusLabel(r.status)),
          String(r.valor),
          r.data_orcamento,
        ].join(';'),
      ),
    ]
    downloadCsv(`relatorio-orcamentos_${applied.start}_${applied.end}.csv`, lines.join('\n'))
  }, [data, applied])

  const chartData = useMemo(() => {
    if (!data) return []
    return data.seriePorDia.map((d) => ({
      ...d,
      label: new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
      }),
    }))
  }, [data])

  const interacoesTotal = data?.interacoesPorCanal.reduce((a, c) => a + c.count, 0) ?? 0

  return (
    <PageContainer max="lg" className="space-y-4">
          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-muted/20 p-3">
            <div className="space-y-1.5">
              <Label htmlFor="rep-start">Início</Label>
              <Input
                id="rep-start"
                type="date"
                value={draftStart}
                onChange={(e) => setDraftStart(e.target.value)}
                className="w-[11rem]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rep-end">Fim</Label>
              <Input
                id="rep-end"
                type="date"
                value={draftEnd}
                onChange={(e) => setDraftEnd(e.target.value)}
                className="w-[11rem]"
              />
            </div>
            <Button type="button" onClick={applyRange} disabled={draftStart > draftEnd}>
              Atualizar
            </Button>
            {(isFetching || isLoading) && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
            )}
          </div>

          {draftStart > draftEnd && (
            <p className="text-sm text-amber-700">A data inicial não pode ser posterior à final.</p>
          )}

          {isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error instanceof Error ? error.message : String(error)}
            </div>
          )}

          {isLoading && !data && (
            <div className="space-y-3">
              <div className="h-20 animate-pulse rounded-lg bg-muted/60" />
              <div className="h-48 animate-pulse rounded-lg bg-muted/60" />
            </div>
          )}

          {data && (
            <>
              <ListPageKpiGrid
                items={[
                  { label: 'Orçamentos no período', value: data.totalOrcamentosNoPeriodo },
                  { label: 'Valor em aberto (período)', value: brl(data.valorEmAbertoNoPeriodo) },
                  {
                    label: 'Valor ganho (período)',
                    value: brl(data.valorGanhoNoPeriodo),
                    valueClassName: 'text-green-700',
                  },
                  { label: 'Interações (período)', value: interacoesTotal },
                ]}
                columnsClassName="sm:grid-cols-2 lg:grid-cols-4"
              />

              <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold text-brand-dark">Orçamentos por dia</h2>
                {chartData.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem orçamentos neste intervalo.</p>
                ) : (
                  <div className="h-[240px] w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e0" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                        <Tooltip
                          contentStyle={{ fontSize: 12 }}
                          formatter={(v: number | string) => [v, 'Orçamentos']}
                          labelFormatter={(_, payload) => {
                            const p = payload?.[0]?.payload as { date?: string } | undefined
                            return p?.date ?? ''
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="count"
                          name="Quantidade"
                          stroke="#d97757"
                          strokeWidth={2}
                          dot={{ r: 3, fill: '#d97757' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div>
                <h2 className="mb-2 text-sm font-semibold text-brand-dark">Por status</h2>
                <SimpleDataTable minWidthClassName="min-w-[400px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="p-2 text-left font-medium">Status</th>
                      <th className="p-2 text-right font-medium">Qtd</th>
                      <th className="p-2 text-right font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ORCAMENTO_STATUS_ORDER.map((st) => {
                      const row = data.porStatus[st]
                      return (
                        <tr key={st} className="border-b border-border/80">
                          <td className="p-2">{orcamentoStatusLabel(st)}</td>
                          <td className="p-2 text-right tabular-nums">{row.count}</td>
                          <td className="p-2 text-right tabular-nums">{brl(row.valorSum)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </SimpleDataTable>
              </div>

              <div>
                <h2 className="mb-2 text-sm font-semibold text-brand-dark">Interações por canal</h2>
                <SimpleDataTable minWidthClassName="min-w-[320px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="p-2 text-left font-medium">Canal</th>
                      <th className="p-2 text-right font-medium">Qtd</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.interacoesPorCanal.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="p-4 text-center text-sm text-muted-foreground">
                          Nenhuma interação no período.
                        </td>
                      </tr>
                    ) : (
                      data.interacoesPorCanal.map((r) => (
                        <tr key={r.canal} className="border-b border-border/80">
                          <td className="p-2">{r.canal}</td>
                          <td className="p-2 text-right tabular-nums">{r.count}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </SimpleDataTable>
              </div>

              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-brand-dark">Top clientes (valor no período)</h2>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={exportOrcamentosCsv}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Exportar CSV (orçamentos)
                  </Button>
                </div>
                <SimpleDataTable minWidthClassName="min-w-[480px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="p-2 text-left font-medium">Cliente</th>
                      <th className="p-2 text-right font-medium">Orçamentos</th>
                      <th className="p-2 text-right font-medium">Valor total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topClientes.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-4 text-center text-sm text-muted-foreground">
                          Sem dados.
                        </td>
                      </tr>
                    ) : (
                      data.topClientes.map((r) => (
                        <tr key={r.clienteId} className="border-b border-border/80">
                          <td className="p-2">{r.clienteNome}</td>
                          <td className="p-2 text-right tabular-nums">{r.orcamentosCount}</td>
                          <td className="p-2 text-right tabular-nums">{brl(r.valorTotal)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </SimpleDataTable>
              </div>

              <div>
                <h2 className="mb-2 text-sm font-semibold text-brand-dark">Orçamentos do período (detalhe)</h2>
                <SimpleDataTable minWidthClassName="min-w-[560px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="p-2 text-left font-medium">Nº</th>
                      <th className="p-2 text-left font-medium">Cliente</th>
                      <th className="p-2 text-left font-medium">Status</th>
                      <th className="p-2 text-right font-medium">Valor</th>
                      <th className="p-2 text-left font-medium">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.orcamentosResumo.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-sm text-muted-foreground">
                          Nenhum orçamento.
                        </td>
                      </tr>
                    ) : (
                      data.orcamentosResumo.map((r) => (
                        <tr key={r.id} className="border-b border-border/80">
                          <td className="p-2 tabular-nums">#{r.display_num}</td>
                          <td className="p-2">{r.clienteNome}</td>
                          <td className="p-2">{orcamentoStatusLabel(r.status)}</td>
                          <td className="p-2 text-right tabular-nums">{brl(r.valor)}</td>
                          <td className="p-2 tabular-nums text-muted-foreground">
                            {new Date(r.data_orcamento + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </SimpleDataTable>
              </div>
            </>
          )}
    </PageContainer>
  )
}
