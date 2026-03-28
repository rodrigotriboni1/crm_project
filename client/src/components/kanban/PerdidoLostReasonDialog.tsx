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
  onConfirm: (lostReason: string | null) => void
  isPending?: boolean
  error?: string | null
}

const lostReasonField: FieldDefinition = {
  id: 'perdido-motivo',
  kind: 'longText',
  label: 'Motivo da perda (opcional)',
  placeholder: 'Ex.: Preço, prazo, concorrente… (vazio grava «Não informado»)',
}

export default function PerdidoLostReasonDialog({
  open,
  orcamento,
  onOpenChange,
  onConfirm,
  isPending,
  error,
}: Props) {
  const [text, setText] = useState('')

  const presetField = useMemo((): FieldDefinition => {
    return {
      id: 'perdido-preset',
      kind: 'select',
      label: 'Atalho',
      options: [
        { value: '', label: '— Escolher ou escrever abaixo —' },
        { value: 'Preço', label: 'Preço' },
        { value: 'Prazo', label: 'Prazo' },
        { value: 'Concorrente', label: 'Concorrente' },
        { value: 'Sem resposta', label: 'Sem resposta' },
        { value: 'Projeto cancelado', label: 'Projeto cancelado' },
      ],
    }
  }, [])

  const [preset, setPreset] = useState('')

  useEffect(() => {
    if (open) {
      setText('')
      setPreset('')
    }
  }, [open, orcamento?.id])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Marcar como perdido</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{orcamento?.clientes?.nome ?? 'Este orçamento'}</span> será
          movido para <strong>Perdido</strong>. Registe o motivo para relatórios (opcional).
        </p>
        <UiComponent
          field={presetField}
          value={preset}
          onChange={(v) => {
            setPreset(v)
            if (v) setText(v)
          }}
          htmlId="perdido-preset"
        />
        <UiComponent field={lostReasonField} value={text} onChange={setText} htmlId="perdido-motivo" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="button" disabled={isPending} onClick={() => onConfirm(text.trim() || null)}>
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
