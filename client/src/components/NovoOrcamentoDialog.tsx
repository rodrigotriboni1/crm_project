import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { useClientesForPicker, useCreateOrcamento, useProdutos } from '@/hooks/useCrm'
import { orcamentoStatusOptions } from '@/lib/fields'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { UiComponent } from '@/components/standards'
import { FormStack } from '@/components/library'
import type { FieldDefinition } from '@/types'
import type { OrcamentoStatus } from '@/types/database'

const PRODUTO_CUSTOM = ''

type Props = {
  user: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const descField: FieldDefinition = {
  id: 'novo-orc-desc',
  kind: 'longText',
  label: 'Descrição no orçamento',
  placeholder: 'Texto exibido no funil (pode editar após escolher o catálogo)',
}

const valorField: FieldDefinition = {
  id: 'novo-orc-valor',
  kind: 'currency',
  label: 'Valor (R$)',
  placeholder: '0,00',
}

const taxField: FieldDefinition = {
  id: 'novo-orc-tax',
  kind: 'document',
  documentVariant: 'cpf_cnpj',
  label: 'CPF / CNPJ',
  placeholder: 'Documento deste orçamento',
}

const dataOrcField: FieldDefinition = {
  id: 'novo-orc-data',
  kind: 'date',
  label: 'Data do orçamento',
}

const followField: FieldDefinition = {
  id: 'novo-orc-follow',
  kind: 'date',
  label: 'Data follow-up',
}

export default function NovoOrcamentoDialog({ user, open, onOpenChange }: Props) {
  const { data: clientes = [] } = useClientesForPicker(user, { ativosApenas: true })
  const { data: produtosCatalogo = [] } = useProdutos(user, { ativosApenas: true })
  const create = useCreateOrcamento(user)

  const [clienteId, setClienteId] = useState('')
  const [produtoId, setProdutoId] = useState(PRODUTO_CUSTOM)
  const [desc, setDesc] = useState('')
  const [valorStr, setValorStr] = useState('')
  const [statusIni, setStatusIni] = useState<OrcamentoStatus>('novo_contato')
  const [dataOrc, setDataOrc] = useState(() => new Date().toISOString().slice(0, 10))
  const [followUp, setFollowUp] = useState('')
  const [taxId, setTaxId] = useState('')

  const clienteField = useMemo((): FieldDefinition => {
    return {
      id: 'novo-orc-cliente',
      kind: 'select',
      label: 'Cliente',
      placeholder: 'Selecione…',
      options: clientes.map((c) => ({ value: c.id, label: c.nome })),
      disabled: clientes.length === 0,
    }
  }, [clientes])

  const produtoField = useMemo((): FieldDefinition => {
    return {
      id: 'novo-orc-prod',
      kind: 'select',
      label: 'Produto do catálogo',
      options: [
        { value: PRODUTO_CUSTOM, label: 'Personalizado (texto livre)' },
        ...produtosCatalogo.map((p) => ({
          value: p.id,
          label: `${p.nome}${p.categoria ? ` · ${p.categoria}` : ''}`,
        })),
      ],
    }
  }, [produtosCatalogo])

  const statusField = useMemo((): FieldDefinition => {
    return {
      id: 'novo-orc-status',
      kind: 'select',
      label: 'Status inicial',
      options: orcamentoStatusOptions(),
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setClienteId('')
    setProdutoId(PRODUTO_CUSTOM)
    setDesc('')
    setValorStr('')
    setStatusIni('novo_contato')
    setDataOrc(new Date().toISOString().slice(0, 10))
    setFollowUp('')
    setTaxId('')
  }, [open])

  const dormindoInvalid = statusIni === 'dormindo' && !followUp.trim()

  const salvar = async () => {
    const valor = Number(valorStr.replace(',', '.'))
    if (!clienteId || Number.isNaN(valor)) return
    const fu = followUp.trim() || null
    if (statusIni === 'dormindo' && !fu) return
    await create.mutateAsync({
      cliente_id: clienteId,
      produto_id: produtoId || null,
      produto_descricao: desc.trim(),
      valor,
      status: statusIni,
      data_orcamento: dataOrc,
      follow_up_at: fu,
      tax_id: taxId.trim() || null,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo orçamento</DialogTitle>
        </DialogHeader>
        <FormStack className="pt-2">
          {clientes.length === 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Cadastre um cliente antes.{' '}
              <Link className="font-medium underline underline-offset-2" to="/clientes">
                Ir para clientes
              </Link>
            </div>
          )}
          <UiComponent field={clienteField} value={clienteId} onChange={setClienteId} />
          <div className="space-y-1">
            <UiComponent
              field={produtoField}
              value={produtoId}
              onChange={(v) => {
                setProdutoId(v)
                if (v) {
                  const p = produtosCatalogo.find((x) => x.id === v)
                  if (p) setDesc(p.nome)
                }
              }}
            />
            <p className="text-[11px] text-muted-foreground">
              Cadastre itens em{' '}
              <Link to="/produtos" className="font-medium underline underline-offset-2">
                Produtos
              </Link>
              .
            </p>
          </div>
          <UiComponent field={descField} value={desc} onChange={setDesc} />
          <UiComponent field={valorField} value={valorStr} onChange={setValorStr} />
          <UiComponent field={taxField} value={taxId} onChange={setTaxId} />
          <UiComponent
            field={statusField}
            value={statusIni}
            onChange={(v) => setStatusIni(v as OrcamentoStatus)}
          />
          <UiComponent field={dataOrcField} value={dataOrc} onChange={setDataOrc} />
          <UiComponent field={followField} value={followUp} onChange={setFollowUp} />
          {dormindoInvalid && (
            <p className="text-xs text-red-600">Obrigatório para status Dormindo.</p>
          )}
          {create.isError && (
            <p className="text-sm text-red-600">{(create.error as Error).message}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={
                !clienteId ||
                !desc.trim() ||
                !valorStr ||
                create.isPending ||
                dormindoInvalid ||
                clientes.length === 0
              }
              onClick={() => void salvar()}
            >
              Salvar orçamento
            </Button>
          </div>
        </FormStack>
      </DialogContent>
    </Dialog>
  )
}
