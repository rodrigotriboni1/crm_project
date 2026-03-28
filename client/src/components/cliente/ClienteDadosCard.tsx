import { useEffect, useMemo, useState } from 'react'
import type { UseMutationResult } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UiComponent } from '@/components/standards'
import DocumentEnrichmentPanel from '@/components/cliente/DocumentEnrichmentPanel'
import { useClienteDocumentLookup } from '@/hooks/useClienteDocumentLookup'
import { digitsOnly } from '@/lib/formatters'
import { clienteDetailCardFields } from '@/lib/fields/clienteFormFields'
import { normalizeClienteTaxId } from '@/lib/taxId'
import type { Cliente, ClienteTipo, ClienteUpdate } from '@/types/database'

type Props = {
  cliente: Cliente
  update: UseMutationResult<Cliente, Error, ClienteUpdate, unknown>
}

export default function ClienteDadosCard({ cliente, update }: Props) {
  const [nomeLocal, setNomeLocal] = useState('')
  const [produtosLocal, setProdutosLocal] = useState('')
  const [obsLocal, setObsLocal] = useState('')
  const [whatsappDigits, setWhatsappDigits] = useState('')
  const [telefoneDigits, setTelefoneDigits] = useState('')
  const [taxDigits, setTaxDigits] = useState('')

  useEffect(() => {
    setTaxDigits(digitsOnly(cliente.tax_id ?? ''))
  }, [cliente.id, cliente.tax_id])

  useEffect(() => {
    setWhatsappDigits(digitsOnly(cliente.whatsapp ?? ''))
  }, [cliente.id, cliente.whatsapp])

  useEffect(() => {
    setTelefoneDigits(digitsOnly(cliente.telefone ?? ''))
  }, [cliente.id, cliente.telefone])

  useEffect(() => {
    setNomeLocal(cliente.nome)
    setProdutosLocal(cliente.produtos_habituais ?? '')
    setObsLocal(cliente.observacoes ?? '')
  }, [cliente.id, cliente.nome, cliente.produtos_habituais, cliente.observacoes])

  const savedTaxDigits = useMemo(() => digitsOnly(cliente.tax_id ?? ''), [cliente.tax_id])
  const taxDirty = taxDigits !== savedTaxDigits
  const { cnpjData, cpfPending, loading, error } = useClienteDocumentLookup(taxDigits)

  const saveField = (patch: ClienteUpdate) => {
    void update.mutateAsync(patch)
  }

  const saveTaxIdAndEnrichment = () => {
    const next = normalizeClienteTaxId(taxDigits)
    const prev = normalizeClienteTaxId(cliente.tax_id ?? '')
    if (next === prev) return
    const patch: ClienteUpdate = { tax_id: next }
    if (next && next.length === 14 && cnpjData?.cnpj === next) {
      patch.document_enrichment = cnpjData
    } else if (next && next.length === 11) {
      patch.document_enrichment = { kind: 'cpf', source: 'pending' }
    } else if (!next) {
      patch.document_enrichment = null
    }
    saveField(patch)
  }

  return (
    <Card className="border shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Dados do cliente
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <UiComponent
            field={clienteDetailCardFields.taxId}
            value={taxDigits}
            onChange={setTaxDigits}
            onControlBlur={() => saveTaxIdAndEnrichment()}
          />
        </div>
        {taxDirty && (taxDigits.length === 11 || taxDigits.length === 14) ? (
          <div className="sm:col-span-2">
            <DocumentEnrichmentPanel
              enrichment={
                taxDigits.length === 14
                  ? cnpjData
                  : taxDigits.length === 11 && cpfPending
                    ? { kind: 'cpf', source: 'pending' }
                    : null
              }
              loading={taxDigits.length === 14 && loading}
              lookupError={taxDigits.length === 14 ? error : null}
            />
          </div>
        ) : cliente.document_enrichment ? (
          <div className="sm:col-span-2">
            <DocumentEnrichmentPanel enrichment={cliente.document_enrichment} />
          </div>
        ) : null}
        <div className="sm:col-span-2">
          <UiComponent
            field={clienteDetailCardFields.nome}
            value={nomeLocal}
            onChange={setNomeLocal}
            onControlBlur={() => {
              if (nomeLocal !== cliente.nome) saveField({ nome: nomeLocal })
            }}
          />
        </div>
        <UiComponent
          field={clienteDetailCardFields.tipo}
          value={cliente.tipo}
          onChange={(v) => saveField({ tipo: v as ClienteTipo })}
        />
        <UiComponent
          field={clienteDetailCardFields.whatsapp}
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
          field={clienteDetailCardFields.telefone}
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
            field={clienteDetailCardFields.produtos}
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
            field={clienteDetailCardFields.obs}
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
  )
}
