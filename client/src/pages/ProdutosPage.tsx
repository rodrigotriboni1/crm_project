import { useMemo, useState } from 'react'
import { Plus, Search, Pencil } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useProdutos, useCreateProduto, useUpdateProduto } from '@/hooks/useCrm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { UiComponent } from '@/components/standards'
import { FormStack } from '@/components/library'
import { cn } from '@/lib/utils'
import type { FieldDefinition } from '@/types'
import type { Produto } from '@/types/database'

const ESPEC_PLACEHOLDER = '{"material":"kraft","largura_mm":350}'

const produtoFormFields = {
  nome: {
    id: 'prod-nome',
    kind: 'shortText',
    label: 'Nome',
    placeholder: 'Ex.: Caixa pizza 35 cm',
  } satisfies FieldDefinition,
  categoria: {
    id: 'prod-cat',
    kind: 'shortText',
    label: 'Categoria (livre)',
    placeholder: 'Ex.: Caixa, Saco, Filme',
  } satisfies FieldDefinition,
  codigo: {
    id: 'prod-cod',
    kind: 'shortText',
    label: 'Código / SKU',
  } satisfies FieldDefinition,
  unidade: {
    id: 'prod-un',
    kind: 'shortText',
    label: 'Unidade',
    placeholder: 'un, kg, m²…',
  } satisfies FieldDefinition,
  descricao: {
    id: 'prod-desc',
    kind: 'longText',
    label: 'Descrição',
  } satisfies FieldDefinition,
  espec: {
    id: 'prod-espec',
    kind: 'json',
    label: 'Especificações (JSON opcional)',
    placeholder: ESPEC_PLACEHOLDER,
    description:
      'Objeto JSON para material, medidas, etc. Deixe vazio ou {} se não usar.',
  } satisfies FieldDefinition,
} as const

function parseEspecificacoesJson(raw: string): Record<string, unknown> {
  const t = raw.trim()
  if (!t) return {}
  const o = JSON.parse(t) as unknown
  if (typeof o !== 'object' || o === null || Array.isArray(o)) {
    throw new Error('Especificações devem ser um objeto JSON (chaves entre {}).')
  }
  return o as Record<string, unknown>
}

export default function ProdutosPage() {
  const { user } = useAuth()
  const { data: produtos = [], isLoading } = useProdutos(user)
  const create = useCreateProduto(user)
  const update = useUpdateProduto(user)

  const [q, setQ] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Produto | null>(null)

  const [nome, setNome] = useState('')
  const [categoria, setCategoria] = useState('')
  const [codigo, setCodigo] = useState('')
  const [unidade, setUnidade] = useState('un')
  const [descricao, setDescricao] = useState('')
  const [especJson, setEspecJson] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)

  const ativoField = useMemo((): FieldDefinition => {
    return {
      id: 'prod-ativo',
      kind: 'select',
      label: 'Estado',
      options: [
        { value: '1', label: 'Ativo (aparece nos orçamentos)' },
        { value: '0', label: 'Arquivado' },
      ],
    }
  }, [])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return produtos
    return produtos.filter(
      (p) =>
        p.nome.toLowerCase().includes(s) ||
        (p.categoria ?? '').toLowerCase().includes(s) ||
        (p.codigo ?? '').toLowerCase().includes(s)
    )
  }, [produtos, q])

  const resetForm = () => {
    setNome('')
    setCategoria('')
    setCodigo('')
    setUnidade('un')
    setDescricao('')
    setEspecJson('')
    setAtivo(true)
    setFormError(null)
  }

  const openCreate = () => {
    setEditing(null)
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (p: Produto) => {
    setEditing(p)
    setNome(p.nome)
    setCategoria(p.categoria ?? '')
    setCodigo(p.codigo ?? '')
    setUnidade(p.unidade || 'un')
    setDescricao(p.descricao ?? '')
    setEspecJson(
      JSON.stringify(p.especificacoes && Object.keys(p.especificacoes).length ? p.especificacoes : {}, null, 2)
    )
    setAtivo(p.ativo)
    setFormError(null)
    setDialogOpen(true)
  }

  const salvar = async () => {
    setFormError(null)
    let espec: Record<string, unknown>
    try {
      espec = parseEspecificacoesJson(especJson)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'JSON inválido')
      return
    }
    if (!nome.trim()) {
      setFormError('Nome é obrigatório.')
      return
    }
    if (editing) {
      await update.mutateAsync({
        id: editing.id,
        patch: {
          nome: nome.trim(),
          categoria: categoria.trim() || null,
          codigo: codigo.trim() || null,
          unidade: unidade.trim() || 'un',
          descricao: descricao.trim() || null,
          especificacoes: espec,
          ativo,
        },
      })
    } else {
      await create.mutateAsync({
        nome: nome.trim(),
        categoria: categoria.trim() || null,
        codigo: codigo.trim() || null,
        unidade: unidade.trim() || 'un',
        descricao: descricao.trim() || null,
        especificacoes: espec,
        ativo,
      })
    }
    setDialogOpen(false)
  }

  const pending = create.isPending || update.isPending

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-4 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 pl-9 text-sm"
            placeholder="Buscar por nome, categoria ou código…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Button size="sm" onClick={() => openCreate()}>
          <Plus className="h-3.5 w-3.5" />
          Novo produto
        </Button>
        <Dialog
          open={dialogOpen}
          onOpenChange={(o) => {
            setDialogOpen(o)
            if (!o) {
              setEditing(null)
              resetForm()
            }
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar produto' : 'Novo produto'}</DialogTitle>
            </DialogHeader>
            <FormStack className="pt-2">
              <UiComponent field={produtoFormFields.nome} value={nome} onChange={setNome} />
              <UiComponent field={produtoFormFields.categoria} value={categoria} onChange={setCategoria} />
              <div className="grid grid-cols-2 gap-2">
                <UiComponent field={produtoFormFields.codigo} value={codigo} onChange={setCodigo} />
                <UiComponent field={produtoFormFields.unidade} value={unidade} onChange={setUnidade} />
              </div>
              <UiComponent field={produtoFormFields.descricao} value={descricao} onChange={setDescricao} />
              <UiComponent field={produtoFormFields.espec} value={especJson} onChange={setEspecJson} />
              {editing && (
                <UiComponent
                  field={ativoField}
                  value={ativo ? '1' : '0'}
                  onChange={(v) => setAtivo(v === '1')}
                />
              )}
              {(formError || create.isError || update.isError) && (
                <p className="text-sm text-red-600">
                  {formError ||
                    (create.error as Error)?.message ||
                    (update.error as Error)?.message}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="button" disabled={pending} onClick={() => void salvar()}>
                  Salvar
                </Button>
              </div>
            </FormStack>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="h-48 animate-pulse rounded-lg bg-muted/60" />
      ) : (
        <Card className="border shadow-none">
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Nenhum produto encontrado.</p>
            ) : (
              filtered.map((p, idx) => (
                <div
                  key={p.id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3',
                    idx < filtered.length - 1 && 'border-b border-border/60'
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.nome}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[p.categoria, p.codigo].filter(Boolean).join(' · ') || '—'} · {p.unidade}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                      p.ativo
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : 'border-muted bg-muted/40 text-muted-foreground'
                    )}
                  >
                    {p.ativo ? 'Ativo' : 'Arquivado'}
                  </span>
                  <Button type="button" variant="outline" size="sm" className="h-8 shrink-0" onClick={() => openEdit(p)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
