import { useMemo, useState } from 'react'
import type { UseMutationResult } from '@tanstack/react-query'
import { MessageSquarePlus } from 'lucide-react'
import { createInteracao } from '@/api/interacoes'
import { CANAIS_CONTATO } from '@/hooks/useCrm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { UiComponent } from '@/components/standards'
import { FormStack } from '@/components/library'
import { clienteInteracaoFormFields } from '@/lib/fields/interacaoFormFields'
import type { Interacao } from '@/types/database'

type CreateIntRow = Omit<Parameters<typeof createInteracao>[3], 'cliente_id'>

type Props = {
  interacoes: Interacao[]
  createInt: UseMutationResult<Interacao, Error, CreateIntRow, unknown>
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
  registerDialogOpen?: boolean
  onRegisterDialogOpenChange?: (open: boolean) => void
}

function dayHeading(d: Date): string {
  const t0 = new Date()
  t0.setHours(0, 0, 0, 0)
  const t1 = new Date(t0)
  t1.setDate(t1.getDate() - 1)
  const dx = new Date(d)
  dx.setHours(0, 0, 0, 0)
  if (dx.getTime() === t0.getTime()) return 'Hoje'
  if (dx.getTime() === t1.getTime()) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

export default function ClienteInteracoesSection({
  interacoes,
  createInt,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  registerDialogOpen: registerOpenControlled,
  onRegisterDialogOpenChange,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const controlled =
    registerOpenControlled !== undefined && onRegisterDialogOpenChange !== undefined
  const dialogOpen = controlled ? registerOpenControlled : internalOpen
  const setDialogOpen = controlled ? onRegisterDialogOpenChange : setInternalOpen

  const [canal, setCanal] = useState<(typeof CANAIS_CONTATO)[number]>('WhatsApp')
  const [anotacao, setAnotacao] = useState('')
  const [dataContato, setDataContato] = useState(() => new Date().toISOString().slice(0, 10))
  const [quickNote, setQuickNote] = useState('')

  const grouped = useMemo(() => {
    const sorted = [...interacoes].sort(
      (a, b) => new Date(b.data_contato).getTime() - new Date(a.data_contato).getTime()
    )
    const out: { heading: string; items: Interacao[] }[] = []
    let currentHeading = ''
    for (const i of sorted) {
      const h = dayHeading(new Date(i.data_contato))
      if (h !== currentHeading) {
        currentHeading = h
        out.push({ heading: h, items: [i] })
      } else {
        out[out.length - 1].items.push(i)
      }
    }
    return out
  }, [interacoes])

  const registrar = async () => {
    await createInt.mutateAsync({
      canal,
      anotacao,
      data_contato: new Date(dataContato + 'T12:00:00').toISOString(),
    })
    setAnotacao('')
    setDialogOpen(false)
  }

  const registrarQuick = async () => {
    const t = quickNote.trim()
    if (!t) return
    await createInt.mutateAsync({
      canal: 'WhatsApp',
      anotacao: t,
      data_contato: new Date().toISOString(),
    })
    setQuickNote('')
  }

  return (
    <Card id="historico-contatos" className="scroll-mt-24 border shadow-none">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Histórico de contatos
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-9 min-h-11 w-full text-xs sm:h-8 sm:min-h-0 sm:w-auto">
                <MessageSquarePlus className="h-3.5 w-3.5" />
                Registrar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar contato</DialogTitle>
              </DialogHeader>
              <FormStack className="pt-2">
                <UiComponent
                  field={clienteInteracaoFormFields.canal}
                  value={canal}
                  onChange={(v) => setCanal(v as (typeof CANAIS_CONTATO)[number])}
                />
                <UiComponent
                  field={clienteInteracaoFormFields.data}
                  value={dataContato}
                  onChange={setDataContato}
                />
                <UiComponent
                  field={clienteInteracaoFormFields.anotacao}
                  value={anotacao}
                  onChange={setAnotacao}
                />
                {createInt.isError && (
                  <p className="text-sm text-red-600">{(createInt.error as Error).message}</p>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    disabled={!anotacao.trim() || createInt.isPending}
                    onClick={() => void registrar()}
                  >
                    Registrar
                  </Button>
                </div>
              </FormStack>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex gap-2 pt-1">
          <Input
            className="min-h-11 flex-1 text-sm"
            placeholder="Nota rápida (WhatsApp, agora)…"
            value={quickNote}
            onChange={(e) => setQuickNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void registrarQuick()
              }
            }}
            aria-label="Nota rápida de contato"
          />
          <Button
            type="button"
            className="min-h-11 shrink-0 px-4"
            disabled={!quickNote.trim() || createInt.isPending}
            onClick={() => void registrarQuick()}
          >
            Enviar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {interacoes.length === 0 ? (
          <p className="px-6 pb-4 text-xs text-muted-foreground">Nenhuma interação registrada.</p>
        ) : (
          grouped.map((g) => (
            <div key={g.heading}>
              <p className="bg-muted/40 px-6 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {g.heading}
              </p>
              {g.items.map((i, idx) => (
                <div
                  key={i.id}
                  className={`px-6 py-3 ${idx < g.items.length - 1 ? 'border-b border-border/60' : ''}`}
                >
                  <div className="mb-1 flex justify-between gap-2">
                    <span className="text-xs font-medium">{i.canal}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(i.data_contato).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-xs text-muted-foreground">{i.anotacao}</p>
                </div>
              ))}
            </div>
          ))
        )}
        {hasMore && onLoadMore && (
          <div className="border-t px-6 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 w-full text-xs"
              disabled={loadingMore}
              onClick={() => onLoadMore()}
            >
              {loadingMore ? 'A carregar…' : 'Carregar mais contactos'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
