import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, MessageSquarePlus, Plus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  useCliente,
  useInteracoes,
  useOrcamentosByCliente,
  useUpdateCliente,
  useCreateInteracao,
  useCreateOrcamento,
  useProdutos,
  clienteTipoLabel,
  CANAIS_CONTATO,
} from '@/hooks/useCrm'
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
import { digitsOnly } from '@/lib/formatters'
import { canalContatoOptions, clienteTipoOptions, orcamentoStatusOptions } from '@/lib/fields'
import type { FieldDefinition } from '@/types'
import type { ClienteTipo, OrcamentoStatus } from '@/types/database'

const O_PRODUTO_CUSTOM = ''

function brl(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

const clienteCardFields = {
  nome: {
    id: 'cd-nome',
    kind: 'shortText',
    label: 'Nome / Empresa',
  } satisfies FieldDefinition,
  tipo: {
    id: 'cd-tipo',
    kind: 'select',
    label: 'Tipo',
    options: clienteTipoOptions,
  } satisfies FieldDefinition,
  whatsapp: {
    id: 'cd-wa',
    kind: 'phone',
    label: 'WhatsApp',
  } satisfies FieldDefinition,
  telefone: {
    id: 'cd-tel',
    kind: 'phone',
    label: 'Telefone',
    optional: true,
  } satisfies FieldDefinition,
  produtos: {
    id: 'cd-prod',
    kind: 'longText',
    label: 'Produtos habituais',
  } satisfies FieldDefinition,
  obs: {
    id: 'cd-obs',
    kind: 'longText',
    label: 'Observações',
    optional: true,
  } satisfies FieldDefinition,
} as const

const interacaoFields = {
  canal: {
    id: 'cd-int-canal',
    kind: 'select',
    label: 'Canal',
    options: canalContatoOptions,
  } satisfies FieldDefinition,
  data: {
    id: 'cd-int-data',
    kind: 'date',
    label: 'Data contato',
  } satisfies FieldDefinition,
  anotacao: {
    id: 'cd-int-anot',
    kind: 'longText',
    label: 'Anotação',
  } satisfies FieldDefinition,
} as const

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

export default function ClienteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { data: cliente, isLoading } = useCliente(user, id)
  const { data: interacoes = [] } = useInteracoes(user, id)
  const { data: orcamentos = [] } = useOrcamentosByCliente(user, id)
  const update = useUpdateCliente(user, id ?? '')
  const createInt = useCreateInteracao(user, id ?? '')
  const createOrc = useCreateOrcamento(user)
  const { data: produtosCatalogo = [] } = useProdutos(user, { ativosApenas: true })

  const [dialogOpen, setDialogOpen] = useState(false)
  const [orcOpen, setOrcOpen] = useState(false)
  const [canal, setCanal] = useState<(typeof CANAIS_CONTATO)[number]>('WhatsApp')
  const [anotacao, setAnotacao] = useState('')
  const [dataContato, setDataContato] = useState(() => new Date().toISOString().slice(0, 10))

  const [oProdutoId, setOProdutoId] = useState(O_PRODUTO_CUSTOM)
  const [oDesc, setODesc] = useState('')
  const [oValor, setOValor] = useState('')
  const [oStatus, setOStatus] = useState<OrcamentoStatus>('novo_contato')
  const [oData, setOData] = useState(() => new Date().toISOString().slice(0, 10))
  const [oFollow, setOFollow] = useState('')
  const [oTaxId, setOTaxId] = useState('')

  const [nomeLocal, setNomeLocal] = useState('')
  const [produtosLocal, setProdutosLocal] = useState('')
  const [obsLocal, setObsLocal] = useState('')
  const [whatsappDigits, setWhatsappDigits] = useState('')
  const [telefoneDigits, setTelefoneDigits] = useState('')

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

  useEffect(() => {
    if (!cliente) return
    setWhatsappDigits(digitsOnly(cliente.whatsapp ?? ''))
  }, [cliente?.id, cliente?.whatsapp])

  useEffect(() => {
    if (!cliente) return
    setTelefoneDigits(digitsOnly(cliente.telefone ?? ''))
  }, [cliente?.id, cliente?.telefone])

  useEffect(() => {
    if (!cliente) return
    setNomeLocal(cliente.nome)
    setProdutosLocal(cliente.produtos_habituais ?? '')
    setObsLocal(cliente.observacoes ?? '')
  }, [cliente?.id, cliente?.nome, cliente?.produtos_habituais, cliente?.observacoes])

  if (!id) return <p className="px-4 py-4 text-sm text-red-700 sm:p-6">Cliente inválido.</p>
  if (isLoading) {
    return (
      <div className="space-y-4 px-4 py-4 sm:p-6">
        <div className="h-6 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-48 animate-pulse rounded-lg bg-muted/60" />
      </div>
    )
  }
  if (!cliente) return <p className="px-4 py-4 text-sm text-muted-foreground sm:p-6">Cliente não encontrado.</p>

  const saveField = (patch: Parameters<typeof update.mutate>[0]) => {
    void update.mutateAsync(patch)
  }

  const registrar = async () => {
    await createInt.mutateAsync({
      canal,
      anotacao,
      data_contato: new Date(dataContato + 'T12:00:00').toISOString(),
    })
    setAnotacao('')
    setDialogOpen(false)
  }

  const salvarOrcamento = async () => {
    const valor = Number(oValor.replace(',', '.'))
    if (!id || Number.isNaN(valor)) return
    const fu = oFollow.trim() || null
    if (oStatus === 'dormindo' && !fu) return
    await createOrc.mutateAsync({
      cliente_id: id,
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
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-4 sm:p-6">
      <div>
        <Link
          to="/clientes"
          className="mb-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Clientes
        </Link>
        <h2 className="text-lg font-semibold">{cliente.nome}</h2>
        <p className="text-xs text-muted-foreground">{clienteTipoLabel(cliente.tipo)}</p>
      </div>

      <Card className="border shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Dados do cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <UiComponent
              field={clienteCardFields.nome}
              value={nomeLocal}
              onChange={setNomeLocal}
              onControlBlur={() => {
                if (nomeLocal !== cliente.nome) saveField({ nome: nomeLocal })
              }}
            />
          </div>
          <UiComponent
            field={clienteCardFields.tipo}
            value={cliente.tipo}
            onChange={(v) => saveField({ tipo: v as ClienteTipo })}
          />
          <UiComponent
            field={clienteCardFields.whatsapp}
            value={whatsappDigits}
            onChange={setWhatsappDigits}
            onControlBlur={() => {
              const next = whatsappDigits || null
              const prev = cliente.whatsapp ? digitsOnly(cliente.whatsapp) : null
              const prevNorm = prev === '' ? null : prev
              if (next !== prevNorm) saveField({ whatsapp: next })
            }}
          />
          <UiComponent
            field={clienteCardFields.telefone}
            value={telefoneDigits}
            onChange={setTelefoneDigits}
            onControlBlur={() => {
              const next = telefoneDigits || null
              const prev = cliente.telefone ? digitsOnly(cliente.telefone) : null
              const prevNorm = prev === '' ? null : prev
              if (next !== prevNorm) saveField({ telefone: next })
            }}
          />
          <div className="sm:col-span-2">
            <UiComponent
              field={clienteCardFields.produtos}
              value={produtosLocal}
              onChange={setProdutosLocal}
              onControlBlur={() => {
                const next = produtosLocal || null
                const prev = cliente.produtos_habituais ?? null
                if (next !== (prev ?? '')) saveField({ produtos_habituais: next })
              }}
            />
          </div>
          <div className="sm:col-span-2">
            <UiComponent
              field={clienteCardFields.obs}
              value={obsLocal}
              onChange={setObsLocal}
              onControlBlur={() => {
                const next = obsLocal || null
                const prev = cliente.observacoes ?? null
                if (next !== (prev ?? '')) saveField({ observacoes: next })
              }}
            />
          </div>
          {update.isError && (
            <p className="text-sm text-red-600 sm:col-span-2">{(update.error as Error).message}</p>
          )}
        </CardContent>
      </Card>

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
                    field={interacaoFields.canal}
                    value={canal}
                    onChange={(v) => setCanal(v as (typeof CANAIS_CONTATO)[number])}
                  />
                  <UiComponent
                    field={interacaoFields.data}
                    value={dataContato}
                    onChange={setDataContato}
                  />
                  <UiComponent field={interacaoFields.anotacao} value={anotacao} onChange={setAnotacao} />
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
                <div className="flex justify-between gap-2 mb-1">
                  <span className="text-xs font-medium">{i.canal}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(i.data_contato).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{i.anotacao}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
