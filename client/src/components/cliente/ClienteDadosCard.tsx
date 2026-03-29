import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOrganization } from '@/contexts/OrganizationContext'
import { supabase } from '@/lib/supabase'
import { listOrganizationMembers, type OrganizationMemberRow } from '@/api/organizationMembers'
import { SelectNative } from '@/components/ui/select-native'
import type { UseMutationResult } from '@tanstack/react-query'
import { EntityActiveBadge, FormStack, SectionCard } from '@/components/library'
import { UiComponent } from '@/components/standards'
import DocumentEnrichmentPanel from '@/components/cliente/DocumentEnrichmentPanel'
import { useClienteDocumentLookup } from '@/hooks/useClienteDocumentLookup'
import { isValidCnpjDigits, isValidCpfDigits } from '@/lib/brCpfCnpj'
import { digitsOnly } from '@/lib/formatters'
import { clienteDetailCardFields } from '@/lib/fields/clienteFormFields'
import { describeClienteTaxIdInputError, normalizeClienteTaxId } from '@/lib/taxId'
import type { FieldDefinition } from '@/types/fields'
import type { Cliente, ClienteTipo, ClienteUpdate } from '@/types/database'

type Props = {
  cliente: Cliente
  update: UseMutationResult<Cliente, Error, ClienteUpdate, unknown>
}

function withPending(field: FieldDefinition, pending: boolean): FieldDefinition {
  return pending ? { ...field, disabled: true } : field
}

export default function ClienteDadosCard({ cliente, update }: Props) {
  const saving = update.isPending

  const [nomeLocal, setNomeLocal] = useState(cliente.nome)
  const [produtosLocal, setProdutosLocal] = useState(cliente.produtos_habituais ?? '')
  const [obsLocal, setObsLocal] = useState(cliente.observacoes ?? '')
  const [whatsappDigits, setWhatsappDigits] = useState(() => digitsOnly(cliente.whatsapp ?? ''))
  const [telefoneDigits, setTelefoneDigits] = useState(() => digitsOnly(cliente.telefone ?? ''))
  const [taxDigits, setTaxDigits] = useState(() => digitsOnly(cliente.tax_id ?? ''))
  const [taxFieldError, setTaxFieldError] = useState<string | null>(null)
  const { activeOrganizationId, organizations } = useOrganization()
  const isOrgOwner = organizations.find((o) => o.id === activeOrganizationId)?.role === 'owner'
  const [assignMembers, setAssignMembers] = useState<OrganizationMemberRow[]>([])

  useEffect(() => {
    setTaxDigits(digitsOnly(cliente.tax_id ?? ''))
    setWhatsappDigits(digitsOnly(cliente.whatsapp ?? ''))
    setTelefoneDigits(digitsOnly(cliente.telefone ?? ''))
    setNomeLocal(cliente.nome)
    setProdutosLocal(cliente.produtos_habituais ?? '')
    setObsLocal(cliente.observacoes ?? '')
    setTaxFieldError(null)
  }, [
    cliente.id,
    cliente.tax_id,
    cliente.whatsapp,
    cliente.telefone,
    cliente.nome,
    cliente.produtos_habituais,
    cliente.observacoes,
  ])

  useEffect(() => {
    if (!supabase || !activeOrganizationId || !isOrgOwner) {
      setAssignMembers([])
      return
    }
    let cancelled = false
    void listOrganizationMembers(supabase, activeOrganizationId).then((rows) => {
      if (!cancelled) setAssignMembers(rows)
    })
    return () => {
      cancelled = true
    }
  }, [activeOrganizationId, isOrgOwner])

  const savedTaxDigits = useMemo(() => digitsOnly(cliente.tax_id ?? ''), [cliente.tax_id])
  const taxDirty = taxDigits !== savedTaxDigits

  const validCnpjDraft = taxDigits.length === 14 && isValidCnpjDigits(taxDigits)
  const validCpfDraft = taxDigits.length === 11 && isValidCpfDigits(taxDigits)
  const showLiveEnrichmentPanel = taxDirty && (validCnpjDraft || validCpfDraft)

  const { cnpjData, cpfPending, loading, error } = useClienteDocumentLookup(taxDigits)

  const saveField = useCallback(
    (patch: ClienteUpdate) => {
      void update.mutateAsync(patch)
    },
    [update]
  )

  const saveTaxIdAndEnrichment = () => {
    const err = describeClienteTaxIdInputError(taxDigits)
    if (err) {
      setTaxFieldError(err)
      return
    }
    setTaxFieldError(null)
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

  const onTaxDigitsChange = (v: string) => {
    setTaxFieldError(null)
    setTaxDigits(v)
  }

  const updateErrorMessage = useMemo(() => {
    if (!update.isError || !update.error) return null
    const msg = (update.error as Error).message
    if (msg.toLowerCase().includes('duplicate')) return 'Já existe outro cliente com este CPF/CNPJ.'
    return msg
  }, [update.isError, update.error])

  const f = useMemo(
    () => ({
      taxId: withPending(clienteDetailCardFields.taxId, saving),
      nome: withPending(clienteDetailCardFields.nome, saving),
      tipo: withPending(clienteDetailCardFields.tipo, saving),
      whatsapp: withPending(clienteDetailCardFields.whatsapp, saving),
      telefone: withPending(clienteDetailCardFields.telefone, saving),
      produtos: withPending(clienteDetailCardFields.produtos, saving),
      obs: withPending(clienteDetailCardFields.obs, saving),
      estadoFicha: withPending(clienteDetailCardFields.estadoFicha, saving),
    }),
    [saving]
  )

  return (
    <SectionCard
      title="Dados do cliente"
      description="As alterações guardam-se ao sair de cada campo (Tab ou clique fora), exceto tipo e estado da ficha que aplicam logo."
    >
      <FormStack className="gap-5">
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Documento</p>
          <UiComponent
            field={f.taxId}
            value={taxDigits}
            onChange={onTaxDigitsChange}
            onControlBlur={() => saveTaxIdAndEnrichment()}
            error={taxFieldError ?? undefined}
          />
          {showLiveEnrichmentPanel ? (
            <DocumentEnrichmentPanel
              enrichment={
                validCnpjDraft ? cnpjData : validCpfDraft && cpfPending ? { kind: 'cpf', source: 'pending' } : null
              }
              loading={validCnpjDraft && loading}
              lookupError={validCnpjDraft ? error : null}
            />
          ) : !taxDirty && cliente.document_enrichment ? (
            <DocumentEnrichmentPanel enrichment={cliente.document_enrichment} />
          ) : null}
        </div>

        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Identificação</p>
          <UiComponent
            field={f.nome}
            value={nomeLocal}
            onChange={setNomeLocal}
            onControlBlur={() => {
              if (nomeLocal !== cliente.nome) saveField({ nome: nomeLocal })
            }}
          />
          <div className="max-w-md">
            <UiComponent
              field={f.tipo}
              value={cliente.tipo}
              onChange={(v) => saveField({ tipo: v as ClienteTipo })}
            />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contacto</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <UiComponent
              field={f.whatsapp}
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
              field={f.telefone}
              value={telefoneDigits}
              onChange={setTelefoneDigits}
              onControlBlur={() => {
                const next = telefoneDigits || null
                const prev = cliente.telefone ? digitsOnly(cliente.telefone) : null
                const prevNorm = prev === '' ? null : prev
                if (next !== prevNorm) saveField({ telefone: next })
              }}
            />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notas</p>
          <UiComponent
            field={f.produtos}
            value={produtosLocal}
            onChange={setProdutosLocal}
            onControlBlur={() => {
              const next = produtosLocal || null
              const prev = cliente.produtos_habituais ?? null
              if (next !== (prev ?? '')) saveField({ produtos_habituais: next })
            }}
          />
          <UiComponent
            field={f.obs}
            value={obsLocal}
            onChange={setObsLocal}
            onControlBlur={() => {
              const next = obsLocal || null
              const prev = cliente.observacoes ?? null
              if (next !== (prev ?? '')) saveField({ observacoes: next })
            }}
          />
        </div>

        {isOrgOwner && (
        <div className="space-y-3 border-t border-border pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Responsável</p>
          <p className="text-xs text-muted-foreground">Quem trata esta ficha (apenas o proprietário pode alterar).</p>
          <SelectNative
            className="max-w-md"
            value={cliente.assigned_user_id}
            disabled={saving}
            aria-label="Responsável comercial"
            onChange={(e) => {
              const v = e.target.value
              if (v && v !== cliente.assigned_user_id) saveField({ assigned_user_id: v })
            }}
          >
            {assignMembers.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.full_name?.trim() || m.email || m.user_id.slice(0, 8) + "…"}
              </option>
            ))}
          </SelectNative>
        </div>
        )}

        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Estado da ficha</p>
            <EntityActiveBadge active={cliente.ativo} activeLabel="Ativo" inactiveLabel="Arquivado" />
          </div>
          <UiComponent
            field={f.estadoFicha}
            value={cliente.ativo ? '1' : '0'}
            onChange={(v) => saveField({ ativo: v === '1' })}
          />
        </div>

        {updateErrorMessage && (
          <p className="text-sm text-red-600" role="alert">
            {updateErrorMessage}
          </p>
        )}
      </FormStack>
    </SectionCard>
  )
}
