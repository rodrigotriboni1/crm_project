import { useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { useOrganization } from '@/contexts/OrganizationContext'
import {
  useApplyOrcamentoUpdate,
  useInteracoes,
  useOrcamento,
  usePatchOrcamento,
} from '@/hooks/useCrm'
import { orcamentoStatusOptions } from '@/lib/fields'
import { digitsOnly } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { UiComponent } from '@/components/standards'
import { FormStack } from '@/components/library'
import StatusBadge from '@/components/StatusBadge'
import { formatOrcamentoDisplayNum } from '@/lib/orcamentoDisplayNum'
import type { FieldDefinition } from '@/types'
import type { OrcamentoStatus } from '@/types/database'

function brl(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

const taxField: FieldDefinition = {
  id: 'orc-detail-tax',
  kind: 'document',
  documentVariant: 'cpf_cnpj',
  label: 'CPF / CNPJ (taxId do negócio)',
  placeholder: 'Opcional — documento ligado a este orçamento',
}

const followField: FieldDefinition = {
  id: 'orc-detail-follow',
  kind: 'date',
  label: 'Data follow-up',
}

const noteField: FieldDefinition = {
  id: 'orc-detail-note',
  kind: 'longText',
  label: 'Anotação (registrada no histórico do cliente)',
  placeholder: 'Opcional — será combinada com a alteração de status/follow-up',
}

const lostReasonField: FieldDefinition = {
  id: 'orc-detail-lost',
  kind: 'longText',
  label: 'Motivo da perda',
  placeholder: 'Opcional se status for Perdido (vazio → «Não informado»)',
}

type Props = {
  user: User | null
  orcamentoId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function OrcamentoDetailModal({ user, orcamentoId, open, onOpenChange }: Props) {
  const { activeOrganizationId } = useOrganization()
  const { data: o, isLoading } = useOrcamento(user, activeOrganizationId, orcamentoId ?? undefined)
  const interacoesQ = useInteracoes(user, activeOrganizationId, o?.cliente_id)
  const interacoes = useMemo(() => interacoesQ.data?.pages.flat() ?? [], [interacoesQ.data])
  const apply = useApplyOrcamentoUpdate(user, activeOrganizationId)
  const patchTax = usePatchOrcamento(user, activeOrganizationId)

  const [status, setStatus] = useState<OrcamentoStatus>('novo_contato')
  const [followUp, setFollowUp] = useState('')
  const [note, setNote] = useState('')
  const [lostReason, setLostReason] = useState('')
  const [taxId, setTaxId] = useState('')

  const statusField = useMemo((): FieldDefinition => {
    return {
      id: 'orc-detail-status',
      kind: 'select',
      label: 'Status',
      options: orcamentoStatusOptions(),
    }
  }, [])

  useEffect(() => {
    if (o) {
      setStatus(o.status)
      setFollowUp(o.follow_up_at?.slice(0, 10) ?? '')
      setNote('')
      setLostReason((o.lost_reason ?? '').trim())
      setTaxId(digitsOnly((o.tax_id ?? '').trim()))
    }
  }, [o?.id, o?.status, o?.follow_up_at, o?.tax_id, o?.lost_reason])

  const salvar = async () => {
    if (!o) return
    const fu = followUp.trim() ? followUp : null
    if (status === 'dormindo' && !fu) {
      return
    }

    const taxDigits = taxId.trim() || null
    const serverDigits = o.tax_id ? digitsOnly(o.tax_id.trim()) : null
    const serverNorm = serverDigits === '' ? null : serverDigits
    if (taxDigits !== serverNorm) {
      await patchTax.mutateAsync({
        id: o.id,
        clienteId: o.cliente_id,
        patch: { tax_id: taxDigits },
      })
    }

    const serverFu = o.follow_up_at?.slice(0, 10) ?? null
    const fuNorm = followUp.trim() ? followUp.trim() : null
    const noteTrim = note.trim() || null
    const serverLost = (o.lost_reason ?? '').trim()
    const lostTrim = lostReason.trim()
    const needsApply =
      status !== o.status ||
      fuNorm !== serverFu ||
      (noteTrim !== null && noteTrim.length > 0) ||
      (status === 'perdido' && lostTrim !== serverLost)

    if (needsApply) {
      await apply.mutateAsync({
        orcamentoId: o.id,
        clienteId: o.cliente_id,
        status,
        followUpAt: fuNorm,
        note: noteTrim,
        lostReason: status === 'perdido' ? (lostTrim || null) : null,
      })
    }

    setNote('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isLoading || !o
              ? 'Orçamento'
              : `Orçamento nº ${formatOrcamentoDisplayNum(o.display_num ?? 0)}`}
          </DialogTitle>
        </DialogHeader>
        {isLoading || !o ? (
          <p className="text-sm text-brand-mid">Carregando…</p>
        ) : (
          <FormStack className="pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={o.status} />
            </div>
            <div>
              <p className="font-sans text-sm font-medium text-brand-dark">{o.clientes?.nome ?? 'Cliente'}</p>
              <p className="mt-1 font-serif text-xs text-brand-mid">
                {o.produto_descricao || '—'} · {brl(Number(o.valor))}
              </p>
              <p className="mt-1 font-serif text-xs text-brand-mid">
                Data orçamento:{' '}
                {o.data_orcamento
                  ? new Date(o.data_orcamento + 'T12:00:00').toLocaleDateString('pt-BR')
                  : '—'}
              </p>
              {o.produtos && (
                <p className="mt-1 font-serif text-xs text-brand-mid">
                  Produto no catálogo:{' '}
                  <span className="font-medium text-foreground">{o.produtos.nome}</span>
                  {o.produtos.categoria ? ` · ${o.produtos.categoria}` : ''}
                  {o.produtos.codigo ? ` · ${o.produtos.codigo}` : ''}
                </p>
              )}
            </div>
            <UiComponent field={taxField} value={taxId} onChange={setTaxId} />
            <UiComponent
              field={statusField}
              value={status}
              onChange={(v) => setStatus(v as OrcamentoStatus)}
            />
            <UiComponent field={followField} value={followUp} onChange={setFollowUp} />
            {status === 'dormindo' && !followUp.trim() && (
              <p className="text-xs text-red-600">Obrigatório para status Dormindo.</p>
            )}
            {status === 'perdido' && (
              <UiComponent field={lostReasonField} value={lostReason} onChange={setLostReason} />
            )}
            <UiComponent field={noteField} value={note} onChange={setNote} />
            {(apply.isError || patchTax.isError) && (
              <p className="text-sm text-red-600">
                {((apply.error ?? patchTax.error) as Error).message}
              </p>
            )}
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              <Button
                type="button"
                disabled={apply.isPending || patchTax.isPending}
                onClick={() => void salvar()}
              >
                Salvar
              </Button>
            </div>
            <div>
              <p className="mb-2 font-sans text-xs font-semibold uppercase tracking-wide text-brand-mid">
                Histórico de interações (cliente)
              </p>
              <ul className="max-h-40 space-y-2 overflow-y-auto text-sm">
                {interacoes.slice(0, 12).map((i) => (
                  <li
                    key={i.id}
                    className="border-b border-brand-surface/60 pb-2 font-serif text-[#3d3c38] last:border-0"
                  >
                    <span className="text-xs text-brand-mid">
                      {new Date(i.data_contato).toLocaleString('pt-BR')} · {i.canal}
                    </span>
                    <p className="mt-0.5">{i.anotacao}</p>
                  </li>
                ))}
                {interacoes.length === 0 && (
                  <li className="text-xs text-brand-mid">Nenhuma interação ainda.</li>
                )}
              </ul>
            </div>
          </FormStack>
        )}
      </DialogContent>
    </Dialog>
  )
}
