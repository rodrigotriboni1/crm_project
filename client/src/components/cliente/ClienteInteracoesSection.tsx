import { useState } from 'react'
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
import { UiComponent } from '@/components/standards'
import { FormStack } from '@/components/library'
import { clienteInteracaoFormFields } from '@/lib/fields/interacaoFormFields'
import type { Interacao } from '@/types/database'

type CreateIntRow = Omit<Parameters<typeof createInteracao>[2], 'cliente_id'>

type Props = {
  interacoes: Interacao[]
  createInt: UseMutationResult<Interacao, Error, CreateIntRow, unknown>
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
}

export default function ClienteInteracoesSection({
  interacoes,
  createInt,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [canal, setCanal] = useState<(typeof CANAIS_CONTATO)[number]>('WhatsApp')
  const [anotacao, setAnotacao] = useState('')
  const [dataContato, setDataContato] = useState(() => new Date().toISOString().slice(0, 10))

  const registrar = async () => {
    await createInt.mutateAsync({
      canal,
      anotacao,
      data_contato: new Date(dataContato + 'T12:00:00').toISOString(),
    })
    setAnotacao('')
    setDialogOpen(false)
  }

  return (
    <Card className="border shadow-none">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Histórico de contatos
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-xs">
                <MessageSquarePlus className="h-3 w-3" />
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
      </CardHeader>
      <CardContent className="p-0">
        {interacoes.length === 0 ? (
          <p className="text-xs text-muted-foreground px-6 pb-4">Nenhuma interação registrada.</p>
        ) : (
          interacoes.map((i, idx) => (
            <div
              key={i.id}
              className={`px-6 py-3 ${idx < interacoes.length - 1 ? 'border-b' : ''}`}
            >
              <div className="mb-1 flex justify-between gap-2">
                <span className="text-xs font-medium">{i.canal}</span>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(i.data_contato).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-xs text-muted-foreground">{i.anotacao}</p>
            </div>
          ))
        )}
        {hasMore && onLoadMore && (
          <div className="border-t px-6 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full text-xs"
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
