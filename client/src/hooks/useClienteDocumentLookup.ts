import { useEffect, useMemo, useState } from 'react'
import { isValidCnpjDigits, isValidCpfDigits } from '@/lib/brCpfCnpj'
import { fetchBrasilApiCnpj, toClienteDocumentEnrichment } from '@/lib/brasilApiCnpj'
import type { ClienteDocumentEnrichment, ClienteDocumentEnrichmentCnpj } from '@/types/clienteDocumentEnrichment'

const DEFAULT_DEBOUNCE_MS = 550

/**
 * Quando `taxDigits` tem 14 dígitos, consulta BrasilAPI após debounce.
 * Com 11 dígitos, marca CPF como pendente (sem API).
 */
export function useClienteDocumentLookup(taxDigits: string, debounceMs = DEFAULT_DEBOUNCE_MS) {
  const [cnpjData, setCnpjData] = useState<ClienteDocumentEnrichmentCnpj | null>(null)
  const [cpfPending, setCpfPending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const t = window.setTimeout(() => {
      if (taxDigits.length === 14 && isValidCnpjDigits(taxDigits)) {
        setCpfPending(false)
        setLoading(true)
        setError(null)
        void (async () => {
          try {
            const raw = await fetchBrasilApiCnpj(taxDigits)
            if (cancelled) return
            setCnpjData(toClienteDocumentEnrichment(raw))
          } catch (e) {
            if (!cancelled) {
              setCnpjData(null)
              setError(e instanceof Error ? e.message : 'Falha na consulta CNPJ.')
            }
          } finally {
            if (!cancelled) setLoading(false)
          }
        })()
      } else if (taxDigits.length === 11 && isValidCpfDigits(taxDigits)) {
        setCnpjData(null)
        setLoading(false)
        setError(null)
        setCpfPending(true)
      } else {
        setCnpjData(null)
        setCpfPending(false)
        setLoading(false)
        setError(null)
      }
    }, debounceMs)

    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [taxDigits, debounceMs])

  const enrichmentForSave: ClienteDocumentEnrichment | null = useMemo(() => {
    if (cnpjData) return cnpjData
    if (cpfPending) return { kind: 'cpf', source: 'pending' }
    return null
  }, [cnpjData, cpfPending])

  return { cnpjData, cpfPending, loading, error, enrichmentForSave }
}
