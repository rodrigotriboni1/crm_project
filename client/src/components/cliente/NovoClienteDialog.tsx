import { useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Plus } from 'lucide-react'
import { useCreateCliente } from '@/hooks/useCrm'
import { useClienteDocumentLookup } from '@/hooks/useClienteDocumentLookup'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { UiComponent } from '@/components/standards'
import { FormStack } from '@/components/library'
import DocumentEnrichmentPanel from '@/components/cliente/DocumentEnrichmentPanel'
import { digitsOnly } from '@/lib/formatters'
import { novoClienteFormFields } from '@/lib/fields/clienteFormFields'
import { normalizeClienteTaxId } from '@/lib/taxId'
import type { ClienteTipo } from '@/types/database'

type Props = {
  user: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function NovoClienteDialog({ user, open, onOpenChange }: Props) {
  const create = useCreateCliente(user)
  const [taxIdDisplay, setTaxIdDisplay] = useState('')
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<ClienteTipo>('novo')
  const [whatsapp, setWhatsapp] = useState('')
  const [telefone, setTelefone] = useState('')
  const [produtos, setProdutos] = useState('')
  const [obs, setObs] = useState('')

  const taxDigits = digitsOnly(taxIdDisplay)
  const { cnpjData, cpfPending, loading, error, enrichmentForSave } = useClienteDocumentLookup(taxDigits)

  const lastFilledCnpj = useRef('')

  useEffect(() => {
    if (!cnpjData || cnpjData.cnpj === lastFilledCnpj.current) return
    lastFilledCnpj.current = cnpjData.cnpj
    setNome(cnpjData.nome_exibicao_sugerido)
    if (cnpjData.telefone_principal_digits) {
      setTelefone(cnpjData.telefone_principal_digits)
    }
  }, [cnpjData])

  useEffect(() => {
    if (taxDigits.length !== 14) {
      lastFilledCnpj.current = ''
    }
  }, [taxDigits])

  const resetForm = () => {
    setTaxIdDisplay('')
    setNome('')
    setTipo('novo')
    setWhatsapp('')
    setTelefone('')
    setProdutos('')
    setObs('')
    lastFilledCnpj.current = ''
  }

  const salvar = async () => {
    const taxNorm = normalizeClienteTaxId(taxIdDisplay)
    await create.mutateAsync({
      nome,
      tipo,
      tax_id: taxNorm,
      document_enrichment: enrichmentForSave,
      whatsapp: whatsapp || undefined,
      telefone: telefone || undefined,
      produtos_habituais: produtos,
      observacoes: obs,
    })
    resetForm()
    onOpenChange(false)
  }

  const showLivePanel = taxDigits.length === 11 || taxDigits.length === 14

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-3.5 w-3.5" />
          Novo cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo cliente</DialogTitle>
        </DialogHeader>
        <FormStack>
          <UiComponent field={novoClienteFormFields.taxId} value={taxIdDisplay} onChange={setTaxIdDisplay} />
          {showLivePanel && (
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
          )}
          <UiComponent field={novoClienteFormFields.nome} value={nome} onChange={setNome} />
          <UiComponent field={novoClienteFormFields.whatsapp} value={whatsapp} onChange={setWhatsapp} />
          <UiComponent
            field={novoClienteFormFields.tipo}
            value={tipo}
            onChange={(v) => setTipo(v as ClienteTipo)}
          />
          <UiComponent field={novoClienteFormFields.telefone} value={telefone} onChange={setTelefone} />
          <UiComponent field={novoClienteFormFields.produtos} value={produtos} onChange={setProdutos} />
          <UiComponent field={novoClienteFormFields.obs} value={obs} onChange={setObs} />
          {create.isError && (
            <p className="text-sm text-red-600">
              {(create.error as Error).message.toLowerCase().includes('duplicate')
                ? 'Já existe um cliente com este CPF/CNPJ.'
                : (create.error as Error).message}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!nome.trim() || create.isPending}
              onClick={() => void salvar()}
            >
              Salvar cliente
            </Button>
          </div>
        </FormStack>
      </DialogContent>
    </Dialog>
  )
}
