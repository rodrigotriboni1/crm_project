import { useMemo, useState } from 'react'
import type { UseMutationResult } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { createOrcamento } from '@/api/orcamentos'
import type { OrcamentoRow } from '@/api/crm'
import StatusBadge from '@/components/StatusBadge'
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
import { formatOrcamentoDisplayNum } from '@/lib/orcamentoDisplayNum'
import { orcamentoStatusOptions } from '@/lib/fields'
import type { FieldDefinition } from '@/types'
import type { Orcamento, OrcamentoStatus, Produto } from '@/types/database'

const O_PRODUTO_CUSTOM = ''

function brl(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

const orcBaseFields = {
  desc: {
    id: 'cd-orc-desc',
    kind: 'longText',
    label: 'Descrição no orçamento',
    placeholder: 'Texto exibido no funil',
  } satisfies FieldDefinition,
  valor: {
    id: 'cd-orc-valor',
    kind: 'currency',
    label: 'Valor (R$)',
  } satisfies FieldDefinition,
  tax: {
    id: 'cd-orc-tax',
    kind: 'document',
    documentVariant: 'cpf_cnpj',
    label: 'CPF / CNPJ',
    placeholder: 'Documento deste orçamento',
  } satisfies FieldDefinition,
  dataOrc: {
    id: 'cd-orc-data',
    kind: 'date',
    label: 'Data do orçamento',
  } satisfies FieldDefinition,
  follow: {
    id: 'cd-orc-follow',
    kind: 'date',
    label: 'Data follow-up',
  } satisfies FieldDefinition,
} as const

type CreateOrcRow = Parameters<typeof createOrcamento>[3]

type Props = {
  clienteId: string
  orcamentos: OrcamentoRow[]
  produtosCatalogo: Produto[]
  createOrc: UseMutationResult<Orcamento, Error, CreateOrcRow, unknown>
}

export default function ClienteOrcamentosSection({
  clienteId,
  orcamentos,
  produtosCatalogo,
  createOrc,
}: Props) {
  const [orcOpen, setOrcOpen] = useState(false)
  const [oProdutoId, setOProdutoId] = useState(O_PRODUTO_CUSTOM)
  const [oDesc, setODesc] = useState('')
  const [oValor, setOValor] = useState('')
  const [oStatus, setOStatus] = useState<OrcamentoStatus>('novo_contato')
  const [oData, setOData] = useState(() => new Date().toISOString().slice(0, 10))
  const [oFollow, setOFollow] = useState('')
  const [oTaxId, setOTaxId] = useState('')

  const orcProdutoField = useMemo((): FieldDefinition => {
    return {
      id: 'cd-orc-prod',
      kind: 'select',
      label: 'Produto do catálogo',
      options: [
        { value: O_PRODUTO_CUSTOM, label: 'Personalizado (texto livre)' },
        ...produtosCatalogo.map((p) => ({
          value: p.id,
          label: `${p.nome}${p.categoria ? ` · ${p.categoria}` : ''}`,
        })),
      ],
    }
  }, [produtosCatalogo])

  const orcStatusField = useMemo((): FieldDefinition => {
    return {
      id: 'cd-orc-status',
      kind: 'select',
      label: 'Status inicial',
      options: orcamentoStatusOptions(),
    }
  }, [])

  const salvarOrcamento = async () => {
    const valor = Number(oValor.replace(',', '.'))
    if (Number.isNaN(valor)) return
    const fu = oFollow.trim() || null
    if (oStatus === 'dormindo' && !fu) return
    await createOrc.mutateAsync({
      cliente_id: clienteId,
      produto_id: oProdutoId || null,
      produto_descricao: oDesc.trim(),
      valor,
      status: oStatus,
      data_orcamento: oData,
      follow_up_at: fu,
      tax_id: oTaxId.trim() || null,
    })
    setOProdutoId(O_PRODUTO_CUSTOM)
    setODesc('')
    setOValor('')
    setOStatus('novo_contato')
    setOData(new Date().toISOString().slice(0, 10))
    setOFollow('')
    setOTaxId('')
    setOrcOpen(false)
  }

  return (
    <Card className="border shadow-none">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Orçamentos
          </CardTitle>
          <Dialog
            open={orcOpen}
            onOpenChange={(open) => {
              setOrcOpen(open)
              if (open) {
                setOProdutoId(O_PRODUTO_CUSTOM)
                setODesc('')
                setOValor('')
                setOStatus('novo_contato')
                setOData(new Date().toISOString().slice(0, 10))
                setOFollow('')
                setOTaxId('')
              }
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-xs">
                <Plus className="h-3 w-3" />
                Novo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo orçamento</DialogTitle>
              </DialogHeader>
              <FormStack className="pt-2">
                <UiComponent
                  field={orcProdutoField}
                  value={oProdutoId}
                  onChange={(v) => {
                    setOProdutoId(v)
                    if (v) {
                      const p = produtosCatalogo.find((x) => x.id === v)
                      if (p) setODesc(p.nome)
                    }
                  }}
                />
                <UiComponent field={orcBaseFields.desc} value={oDesc} onChange={setODesc} />
                <UiComponent field={orcBaseFields.valor} value={oValor} onChange={setOValor} />
                <UiComponent field={orcBaseFields.tax} value={oTaxId} onChange={setOTaxId} />
                <UiComponent
                  field={orcStatusField}
                  value={oStatus}
                  onChange={(v) => setOStatus(v as OrcamentoStatus)}
                />
                <UiComponent field={orcBaseFields.dataOrc} value={oData} onChange={setOData} />
                <UiComponent field={orcBaseFields.follow} value={oFollow} onChange={setOFollow} />
                {oStatus === 'dormindo' && !oFollow.trim() && (
                  <p className="text-xs text-red-600">Obrigatório para Dormindo.</p>
                )}
                {createOrc.isError && (
                  <p className="text-sm text-red-600">{(createOrc.error as Error).message}</p>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" type="button" onClick={() => setOrcOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    disabled={createOrc.isPending || !oDesc.trim()}
                    onClick={() => void salvarOrcamento()}
                  >
                    Salvar
                  </Button>
                </div>
              </FormStack>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {orcamentos.length === 0 ? (
          <p className="text-xs text-muted-foreground px-6 pb-4">Nenhum orçamento ainda.</p>
        ) : (
          orcamentos.map((o, idx) => (
            <div
              key={o.id}
              className={`flex items-center gap-2 px-6 py-3 ${idx < orcamentos.length - 1 ? 'border-b' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
                  <span className="mr-1.5 font-mono text-[10px] text-muted-foreground">
                    {formatOrcamentoDisplayNum(o.display_num ?? 0)}
                  </span>
                  {o.produto_descricao || '—'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {brl(Number(o.valor))}
                  {o.data_orcamento
                    ? ` · ${new Date(o.data_orcamento + 'T12:00:00').toLocaleDateString('pt-BR')}`
                    : ''}
                </p>
              </div>
              <StatusBadge status={o.status} />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
