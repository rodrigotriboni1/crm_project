import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { UiComponent } from '@/components/standards'
import type { FieldDefinition } from '@/types'
import type { OrcamentoRow } from '@/api/crm'

type Props = {
  open: boolean
  orcamento: OrcamentoRow | null
  onOpenChange: (open: boolean) => void
  onConfirm: (followUpDate: string) => void
  isPending?: boolean
  error?: string | null
}

export default function DormindoFollowUpDialog({
  open,
  orcamento,
  onOpenChange,
  onConfirm,
  isPending,
  error,
}: Props) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))

  const dateField = useMemo((): FieldDefinition => {
    return {
      id: 'dormindo-fu',
      kind: 'date',
      label: 'Data follow-up',
    }
  }, [])

  useEffect(() => {
    if (open) setDate(new Date().toISOString().slice(0, 10))
  }, [open, orcamento?.id])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Data de follow-up obrigatória</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Para mover <span className="font-medium text-foreground">{orcamento?.clientes?.nome ?? 'este orçamento'}</span>{' '}
          para <strong>Dormindo</strong>, defina a data do próximo contato.
        </p>
        <UiComponent field={dateField} value={date} onChange={setDate} htmlId="dormindo-fu" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!date.trim() || isPending}
            onClick={() => onConfirm(date.trim())}
          >
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
