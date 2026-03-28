import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useClientes, useCreateCliente } from '@/hooks/useCrm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { UiComponent } from '@/components/standards'
import {
  EmptyState,
  FormStack,
  PageContainer,
  SectionCard,
  ToolbarRow,
} from '@/components/library'
import AvatarCircle from '@/components/AvatarCircle'
import { formatFieldValueForDisplay, digitsOnly } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type { ClienteTipo, FieldDefinition } from '@/types'

const phoneDisplayField = { kind: 'phone' as const }

const clienteFields = {
  nome: {
    id: 'cliente-nome',
    kind: 'shortText',
    label: 'Nome / Empresa',
    placeholder: 'Nome',
  } satisfies FieldDefinition,
  whatsapp: {
    id: 'cliente-whatsapp',
    kind: 'phone',
    label: 'WhatsApp',
  } satisfies FieldDefinition,
  tipo: {
    id: 'cliente-tipo',
    kind: 'select',
    label: 'Tipo',
    options: [
      { value: 'novo', label: 'Novo' },
      { value: 'recompra', label: 'Recompra' },
    ],
  } satisfies FieldDefinition,
  telefone: {
    id: 'cliente-telefone',
    kind: 'phone',
    label: 'Telefone',
    optional: true,
  } satisfies FieldDefinition,
  produtos: {
    id: 'cliente-produtos',
    kind: 'longText',
    label: 'Produtos habituais',
  } satisfies FieldDefinition,
  obs: {
    id: 'cliente-obs',
    kind: 'longText',
    label: 'Observações',
    optional: true,
  } satisfies FieldDefinition,
} as const

export default function ClientesPage() {
  const { user } = useAuth()
  const { data: clientes = [], isLoading } = useClientes(user)
  const create = useCreateCliente(user)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<ClienteTipo>('novo')
  const [whatsapp, setWhatsapp] = useState('')
  const [telefone, setTelefone] = useState('')
  const [produtos, setProdutos] = useState('')
  const [obs, setObs] = useState('')

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return clientes
    return clientes.filter((c) => c.nome.toLowerCase().includes(s))
  }, [clientes, q])

  const resetForm = () => {
    setNome('')
    setTipo('novo')
    setWhatsapp('')
    setTelefone('')
    setProdutos('')
    setObs('')
  }

  const salvar = async () => {
    await create.mutateAsync({
      nome,
      tipo,
      whatsapp: whatsapp || undefined,
      telefone: telefone || undefined,
      produtos_habituais: produtos,
      observacoes: obs,
    })
    resetForm()
    setOpen(false)
  }

  return (
    <PageContainer max="sm" className="space-y-4">
      <ToolbarRow
        start={
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9 h-9 text-sm"
              placeholder="Buscar por nome ou empresa…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        }
        end={
          <Dialog open={open} onOpenChange={setOpen}>
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
              <FormStack className="pt-2">
                <UiComponent field={clienteFields.nome} value={nome} onChange={setNome} />
                <UiComponent field={clienteFields.whatsapp} value={whatsapp} onChange={setWhatsapp} />
                <UiComponent
                  field={clienteFields.tipo}
                  value={tipo}
                  onChange={(v) => setTipo(v as ClienteTipo)}
                />
                <UiComponent field={clienteFields.telefone} value={telefone} onChange={setTelefone} />
                <UiComponent field={clienteFields.produtos} value={produtos} onChange={setProdutos} />
                <UiComponent field={clienteFields.obs} value={obs} onChange={setObs} />
                {create.isError && (
                  <p className="text-sm text-red-600">{(create.error as Error).message}</p>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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
        }
      />

      {isLoading ? (
        <div className="h-48 animate-pulse rounded-lg bg-muted/60" />
      ) : (
        <SectionCard contentClassName="p-2">
          {filtered.length === 0 ? (
            <EmptyState title="Nenhum cliente encontrado." />
          ) : (
            filtered.map((c) => (
                <Link
                  key={c.id}
                  to={`/clientes/${c.id}`}
                  className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer rounded-lg transition-colors"
                >
                  <AvatarCircle name={c.nome} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.whatsapp && digitsOnly(c.whatsapp)
                        ? formatFieldValueForDisplay(phoneDisplayField, c.whatsapp)
                        : 'Sem telefone'}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'text-[11px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0',
                      c.tipo === 'recompra'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    )}
                  >
                    {c.tipo === 'recompra' ? 'Recompra' : 'Novo'}
                  </span>
                </Link>
              ))
            )}
        </SectionCard>
      )}
    </PageContainer>
  )
}
