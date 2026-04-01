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
import { DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SheetHeader, SheetTitle } from '@/components/ui/sheet'
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

export type OrcamentoDetailPanelProps = {
  variant: 'dialog' | 'sheet'
  user: User | null
  orcamentoId: string | null
  onClose: () => void
}

export function OrcamentoDetailPanel({ variant, user, orcamentoId, onClose }: OrcamentoDetailPanelProps) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps granulares (evita reset por nova ref de `o`)
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
    onClose()
  }

  const titleText =
    isLoading || !o ? 'Orçamento' : `Orçamento nº ${formatOrcamentoDisplayNum(o.display_num ?? 0)}`

  const Header = variant === 'dialog' ? DialogHeader : SheetHeader
  const Title = variant === 'dialog' ? DialogTitle : SheetTitle

  return (
    <>
      <Header>
        <Title>{titleText}</Title>
      </Header>
      {isLoading || !o ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <FormStack className="pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={o.status} />
          </div>
          <div>
            <p className="font-heading text-sm font-medium text-foreground">{o.clientes?.nome ?? 'Cliente'}</p>
            <p className="mt-1 font-body text-xs text-muted-foreground">
              {o.produto_descricao || '—'} · {brl(Number(o.valor))}
            </p>
            <p className="mt-1 font-body text-xs text-muted-foreground">
              Data orçamento:{' '}
              {o.data_orcamento
                ? new Date(o.data_orcamento + 'T12:00:00').toLocaleDateString('pt-BR')
                : '—'}
            </p>
            {o.produtos && (
              <p className="mt-1 font-body text-xs text-muted-foreground">
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
            <Button type="button" variant="outline" onClick={onClose}>
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
            <p className="mb-2 font-heading text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Histórico de interações (cliente)
            </p>
            <ul className="max-h-40 space-y-2 overflow-y-auto text-sm">
              {interacoes.slice(0, 12).map((i) => (
                <li
                  key={i.id}
                  className="border-b border-border pb-2 font-body text-foreground/90 last:border-0"
                >
                  <span className="text-xs text-muted-foreground">
                    {new Date(i.data_contato).toLocaleString('pt-BR')} · {i.canal}
                  </span>
                  <p className="mt-0.5">{i.anotacao}</p>
                </li>
              ))}
              {interacoes.length === 0 && (
                <li className="text-xs text-muted-foreground">Nenhuma interação ainda.</li>
              )}
            </ul>
          </div>
        </FormStack>
      )}
    </>
  )
}
