import { useMemo, useState } from 'react'
import { LayoutList, Plus, Search, Pencil, Table2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useProdutos, useCreateProduto, useUpdateProduto } from '@/hooks/useCrm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState, FormStack, PageContainer, SectionCard, ToolbarRow } from '@/components/library'
import { UiComponent } from '@/components/standards'
import { cn } from '@/lib/utils'
import type { FieldDefinition } from '@/types'
import type { Produto } from '@/types/database'

const ESPEC_PLACEHOLDER = '{"acabamento":"fosco"}'

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
  specMaterial: {
    id: 'prod-spec-mat',
    kind: 'shortText',
    label: 'Material (especificação)',
    placeholder: 'Ex.: kraft, OPP',
  } satisfies FieldDefinition,
  specLargura: {
    id: 'prod-spec-larg',
    kind: 'shortText',
    label: 'Largura (mm)',
    placeholder: 'Opcional',
  } satisfies FieldDefinition,
  specAltura: {
    id: 'prod-spec-alt',
    kind: 'shortText',
    label: 'Altura (mm)',
    placeholder: 'Opcional',
  } satisfies FieldDefinition,
  specProf: {
    id: 'prod-spec-prof',
    kind: 'shortText',
    label: 'Profundidade (mm)',
    placeholder: 'Opcional',
  } satisfies FieldDefinition,
  espec: {
    id: 'prod-espec',
    kind: 'json',
    label: 'JSON avançado (opcional)',
    placeholder: ESPEC_PLACEHOLDER,
    description: 'Outras chaves JSON; funde com material e medidas acima ao guardar.',
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

function numOrString(raw: string): number | string | undefined {
  const s = raw.trim()
  if (!s) return undefined
  const n = Number(s.replace(',', '.'))
  return Number.isFinite(n) ? n : s
}

function mergeEspecificacoes(
  base: Record<string, unknown>,
  material: string,
  largura: string,
  altura: string,
  prof: string
): Record<string, unknown> {
  const out = { ...base }
  if (material.trim()) out.material = material.trim()
  const lw = numOrString(largura)
  if (lw !== undefined) out.largura_mm = lw
  const h = numOrString(altura)
  if (h !== undefined) out.altura_mm = h
  const p = numOrString(prof)
  if (p !== undefined) out.profundidade_mm = p
  return out
}

function readSpecStrings(e: Record<string, unknown> | undefined) {
  if (!e) {
    return { material: '', largura: '', altura: '', prof: '' }
  }
  return {
    material: String(e.material ?? ''),
    largura: e.largura_mm != null ? String(e.largura_mm) : '',
    altura: e.altura_mm != null ? String(e.altura_mm) : '',
    prof: e.profundidade_mm != null ? String(e.profundidade_mm) : '',
  }
}

type ViewMode = 'list' | 'table'
type SortKey = 'nome' | 'categoria' | 'codigo' | 'unidade' | 'ativo'

function categoryLabel(p: Produto): string {
  const c = (p.categoria ?? '').trim()
  return c || 'Sem categoria'
}

export default function ProdutosPage() {
  const { user } = useAuth()
  const { data: produtos = [], isLoading } = useProdutos(user)
  const create = useCreateProduto(user)
  const update = useUpdateProduto(user)

  const [q, setQ] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Produto | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [groupByCategory, setGroupByCategory] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('nome')
  const [sortAsc, setSortAsc] = useState(true)

  const [nome, setNome] = useState('')
  const [categoria, setCategoria] = useState('')
  const [codigo, setCodigo] = useState('')
  const [unidade, setUnidade] = useState('un')
  const [descricao, setDescricao] = useState('')
  const [specMaterial, setSpecMaterial] = useState('')
  const [specLargura, setSpecLargura] = useState('')
  const [specAltura, setSpecAltura] = useState('')
  const [specProf, setSpecProf] = useState('')
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

  const kpis = useMemo(() => {
    const ativos = produtos.filter((p) => p.ativo).length
    const arquivados = produtos.length - ativos
    return { total: produtos.length, ativos, arquivados }
  }, [produtos])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    let list = produtos
    if (s) {
      list = produtos.filter(
        (p) =>
          p.nome.toLowerCase().includes(s) ||
          (p.categoria ?? '').toLowerCase().includes(s) ||
          (p.codigo ?? '').toLowerCase().includes(s) ||
          (p.descricao ?? '').toLowerCase().includes(s)
      )
    }
    const dir = sortAsc ? 1 : -1
    return [...list].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'nome') {
        cmp = a.nome.localeCompare(b.nome, 'pt', { sensitivity: 'base' })
      } else if (sortKey === 'categoria') {
        cmp = categoryLabel(a).localeCompare(categoryLabel(b), 'pt', { sensitivity: 'base' })
        if (cmp === 0) cmp = a.nome.localeCompare(b.nome, 'pt', { sensitivity: 'base' })
      } else if (sortKey === 'codigo') {
        cmp = (a.codigo ?? '').localeCompare(b.codigo ?? '', 'pt', { sensitivity: 'base' })
      } else if (sortKey === 'unidade') {
        cmp = a.unidade.localeCompare(b.unidade, 'pt')
      } else {
        cmp = Number(a.ativo) - Number(b.ativo)
        if (cmp === 0) cmp = a.nome.localeCompare(b.nome, 'pt', { sensitivity: 'base' })
      }
      return cmp * dir
    })
  }, [produtos, q, sortKey, sortAsc])

  const grouped = useMemo(() => {
    if (!groupByCategory) return null
    const m = new Map<string, Produto[]>()
    for (const p of filtered) {
      const k = categoryLabel(p)
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(p)
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b, 'pt', { sensitivity: 'base' }))
  }, [filtered, groupByCategory])

  const resetForm = () => {
    setNome('')
    setCategoria('')
    setCodigo('')
    setUnidade('un')
    setDescricao('')
    setSpecMaterial('')
    setSpecLargura('')
    setSpecAltura('')
    setSpecProf('')
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
    const spec = readSpecStrings(p.especificacoes)
    setSpecMaterial(spec.material)
    setSpecLargura(spec.largura)
    setSpecAltura(spec.altura)
    setSpecProf(spec.prof)
    const e = p.especificacoes && typeof p.especificacoes === 'object' ? { ...p.especificacoes } : {}
    delete e.material
    delete e.largura_mm
    delete e.altura_mm
    delete e.profundidade_mm
    setEspecJson(Object.keys(e).length ? JSON.stringify(e, null, 2) : '')
    setAtivo(p.ativo)
    setFormError(null)
    setDialogOpen(true)
  }

  const salvar = async () => {
    setFormError(null)
    let base: Record<string, unknown>
    try {
      base = parseEspecificacoesJson(especJson)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'JSON inválido')
      return
    }
    const espec = mergeEspecificacoes(base, specMaterial, specLargura, specAltura, specProf)
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

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortAsc((a) => !a)
    else {
      setSortKey(k)
      setSortAsc(k !== 'ativo')
    }
  }

  const renderRow = (p: Produto, showBorder: boolean) => (
    <div
      key={p.id}
      className={cn('flex items-center gap-3 px-4 py-3', showBorder && 'border-b border-border/60')}
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
  )

  const sortableTh = (label: string, k: SortKey) => (
    <th className="p-2 font-medium">
      <button
        type="button"
        className="text-left hover:underline"
        onClick={() => toggleSort(k)}
      >
        {label}
        {sortKey === k ? (sortAsc ? ' ↑' : ' ↓') : ''}
      </button>
    </th>
  )

  return (
    <PageContainer max="lg" className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Total</p>
          <p className="text-lg font-semibold tabular-nums">{kpis.total}</p>
        </div>
        <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Ativos</p>
          <p className="text-lg font-semibold tabular-nums text-green-700">{kpis.ativos}</p>
        </div>
        <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Arquivados</p>
          <p className="text-lg font-semibold tabular-nums text-muted-foreground">{kpis.arquivados}</p>
        </div>
      </div>

      <ToolbarRow
        start={
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 pl-9 text-sm"
              placeholder="Nome, categoria, código ou descrição…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        }
        end={
          <>
            <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
              <Button
                type="button"
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 px-2"
                onClick={() => setViewMode('list')}
                aria-label="Vista em lista"
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 px-2"
                onClick={() => setViewMode('table')}
                aria-label="Vista em tabela"
              >
                <Table2 className="h-4 w-4" />
              </Button>
            </div>
            <Button
              type="button"
              variant={groupByCategory ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setGroupByCategory((g) => !g)}
            >
              Por categoria
            </Button>
            <Button size="sm" onClick={() => openCreate()}>
              <Plus className="h-3.5 w-3.5" />
              Novo produto
            </Button>
          </>
        }
      />

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
            <p className="text-xs font-medium text-muted-foreground">Especificações técnicas</p>
            <div className="grid grid-cols-2 gap-2">
              <UiComponent field={produtoFormFields.specMaterial} value={specMaterial} onChange={setSpecMaterial} />
              <UiComponent field={produtoFormFields.specLargura} value={specLargura} onChange={setSpecLargura} />
              <UiComponent field={produtoFormFields.specAltura} value={specAltura} onChange={setSpecAltura} />
              <UiComponent field={produtoFormFields.specProf} value={specProf} onChange={setSpecProf} />
            </div>
            <details className="rounded-md border border-border/80 bg-muted/20 p-2">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                JSON avançado (outras propriedades)
              </summary>
              <div className="pt-2">
                <UiComponent field={produtoFormFields.espec} value={especJson} onChange={setEspecJson} />
              </div>
            </details>
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

      {isLoading ? (
        <div className="h-48 animate-pulse rounded-lg bg-muted/60" />
      ) : filtered.length === 0 ? (
        <SectionCard>
          <EmptyState
            title="Nenhum produto encontrado"
            description={
              produtos.length === 0
                ? 'Crie o primeiro item do catálogo para usar nos orçamentos.'
                : 'Ajuste a pesquisa para ver mais resultados.'
            }
            action={
              produtos.length === 0 ? (
                <Button size="sm" onClick={() => openCreate()}>
                  Novo produto
                </Button>
              ) : undefined
            }
          />
        </SectionCard>
      ) : viewMode === 'table' ? (
        <Card className="border shadow-none">
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[520px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs">
                  {sortableTh('Nome', 'nome')}
                  {sortableTh('Categoria', 'categoria')}
                  {sortableTh('SKU', 'codigo')}
                  {sortableTh('Un.', 'unidade')}
                  {sortableTh('Estado', 'ativo')}
                  <th className="p-2 w-24" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-border/60">
                    <td className="p-2 font-medium">{p.nome}</td>
                    <td className="p-2 text-muted-foreground">{categoryLabel(p)}</td>
                    <td className="p-2 font-mono text-xs">{p.codigo ?? '—'}</td>
                    <td className="p-2">{p.unidade}</td>
                    <td className="p-2">
                      <span
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[11px] font-medium',
                          p.ativo
                            ? 'border-green-200 bg-green-50 text-green-700'
                            : 'border-muted bg-muted/40 text-muted-foreground'
                        )}
                      >
                        {p.ativo ? 'Ativo' : 'Arquivado'}
                      </span>
                    </td>
                    <td className="p-2">
                      <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => openEdit(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : groupByCategory && grouped ? (
        <div className="space-y-4">
          {grouped.map(([cat, items]) => (
            <Card key={cat} className="border shadow-none">
              <div className="border-b border-border/60 bg-muted/30 px-4 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{cat}</p>
                <p className="text-[11px] text-muted-foreground">{items.length} produto(s)</p>
              </div>
              <CardContent className="p-0">{items.map((p, i) => renderRow(p, i < items.length - 1))}</CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border shadow-none">
          <CardContent className="p-0">
            {filtered.map((p, idx) => renderRow(p, idx < filtered.length - 1))}
          </CardContent>
        </Card>
      )}
    </PageContainer>
  )
}
