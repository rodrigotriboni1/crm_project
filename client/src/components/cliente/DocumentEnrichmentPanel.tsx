import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  isCnpjEnrichment,
  isCpfEnrichment,
  type ClienteDocumentEnrichment,
} from '@/types/clienteDocumentEnrichment'

function brlCapital(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function formatCep(cep: string | null | undefined) {
  if (!cep) return ''
  const d = cep.replace(/\D/g, '')
  if (d.length === 8) return `${d.slice(0, 5)}-${d.slice(5)}`
  return cep
}

type Props = {
  enrichment: ClienteDocumentEnrichment | null
  /** Consulta em curso (CNPJ). */
  loading?: boolean
  /** Erro da última consulta CNPJ. */
  lookupError?: string | null
  className?: string
}

export default function DocumentEnrichmentPanel({
  enrichment,
  loading,
  lookupError,
  className,
}: Props) {
  if (loading) {
    return (
      <Card className={`border border-dashed shadow-none ${className ?? ''}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Dados do documento
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">Consultando CNPJ na BrasilAPI…</CardContent>
      </Card>
    )
  }

  if (lookupError) {
    return (
      <Card className={`border border-destructive/30 shadow-none ${className ?? ''}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Consulta CNPJ
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-red-600">{lookupError}</CardContent>
      </Card>
    )
  }

  if (!enrichment) return null

  if (isCpfEnrichment(enrichment)) {
    return (
      <Card className={`border border-dashed shadow-none ${className ?? ''}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            CPF detectado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs text-muted-foreground">
          <p>
            Não há integração de consulta de CPF nesta versão. Os dados serão guardados com este documento;
            quando existir API, o preenchimento automático seguirá o mesmo padrão do CNPJ.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!isCnpjEnrichment(enrichment)) return null

  const e = enrichment
  const end = e.endereco
  const endLine = [
    end.logradouro,
    end.numero,
    end.complemento,
    end.bairro,
    end.municipio && end.uf ? `${end.municipio}/${end.uf}` : end.municipio || end.uf,
    formatCep(end.cep),
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <Card className={`border shadow-none ${className ?? ''}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Dados públicos (CNPJ · BrasilAPI)
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-xs sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <p className="font-medium text-foreground">Razão social</p>
          <p className="text-muted-foreground">{e.razao_social}</p>
          {e.nome_fantasia ? (
            <p className="text-muted-foreground">
              <span className="text-foreground/80">Nome fantasia:</span> {e.nome_fantasia}
            </p>
          ) : null}
        </div>
        {e.situacao_cadastral ? (
          <div>
            <p className="font-medium text-foreground">Situação cadastral</p>
            <p className="text-muted-foreground">{e.situacao_cadastral}</p>
          </div>
        ) : null}
        {e.natureza_juridica ? (
          <div>
            <p className="font-medium text-foreground">Natureza jurídica</p>
            <p className="text-muted-foreground">{e.natureza_juridica}</p>
          </div>
        ) : null}
        {e.capital_social != null && e.capital_social > 0 ? (
          <div>
            <p className="font-medium text-foreground">Capital social</p>
            <p className="text-muted-foreground">{brlCapital(e.capital_social)}</p>
          </div>
        ) : null}
        {e.cnae_principal ? (
          <div className="sm:col-span-2">
            <p className="font-medium text-foreground">CNAE principal</p>
            <p className="text-muted-foreground">
              {e.cnae_principal.codigo} — {e.cnae_principal.descricao}
            </p>
          </div>
        ) : null}
        {endLine ? (
          <div className="sm:col-span-2">
            <p className="font-medium text-foreground">Endereço</p>
            <p className="text-muted-foreground">{endLine}</p>
          </div>
        ) : null}
        {e.email ? (
          <div className="sm:col-span-2">
            <p className="font-medium text-foreground">E-mail</p>
            <p className="text-muted-foreground">{e.email}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
