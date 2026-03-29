import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import DataEditor, {
  GridCellKind,
  type EditableGridCell,
  type GridCell,
  type GridColumn,
  type Item,
} from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import { isValidCnpjDigits, isValidCpfDigits } from '@/lib/brCpfCnpj'
import { digitsOnly } from '@/lib/formatters'
import { formatUltimoContatoLabel } from '@/lib/clienteListHelpers'
import { normalizeClienteTaxId } from '@/lib/taxId'
import type { ClienteListItem, ClienteTipo, ClienteUpdate } from '@/types/database'

const COL = {
  NOME: 0,
  TAX: 1,
  TIPO: 2,
  WA: 3,
  TEL: 4,
  PROD: 5,
  OBS: 6,
  ATIVO: 7,
  ULTIMO: 8,
} as const

const GRID_COLUMNS: GridColumn[] = [
  { title: 'Nome', width: 240 },
  { title: 'CPF/CNPJ', width: 130 },
  { title: 'Tipo (novo / recompra)', width: 150 },
  { title: 'WhatsApp', width: 130 },
  { title: 'Telefone', width: 130 },
  { title: 'Produtos habituais', width: 180 },
  { title: 'Observações', width: 220 },
  { title: 'Ativo', width: 72 },
  { title: 'Último contacto', width: 140 },
]

function taxCellEditorInputValid(raw: string): boolean {
  const d = digitsOnly(raw)
  if (d.length === 0) return true
  if (d.length < 11) return true
  if (d.length === 11) return isValidCpfDigits(d)
  if (d.length < 14) return true
  if (d.length === 14) return isValidCnpjDigits(d)
  return false
}

function parseTipoCell(raw: string): ClienteTipo | null {
  const s = raw.trim().toLowerCase()
  if (s === 'recompra' || s === 'r' || s === 'rec') return 'recompra'
  if (s === 'novo' || s === 'n' || s === 'new') return 'novo'
  return null
}

function mergedRow(row: ClienteListItem, draft: ClienteUpdate | undefined): ClienteListItem {
  if (!draft) return row
  return { ...row, ...draft, ultimo_contato: row.ultimo_contato }
}

function patchFromCell(col: number, value: EditableGridCell, base: ClienteListItem): ClienteUpdate | null {
  if (col === COL.ULTIMO) return null

  if (value.kind === GridCellKind.Boolean && col === COL.ATIVO) {
    if (value.data === null || value.data === undefined) return null
    const ativo = Boolean(value.data)
    return ativo === base.ativo ? null : { ativo }
  }

  if (value.kind !== GridCellKind.Text) return null
  const t = value.data

  switch (col) {
    case COL.NOME: {
      const nome = t.trim()
      return nome === base.nome.trim() ? null : { nome: nome }
    }
    case COL.TAX: {
      const tax_id = normalizeClienteTaxId(t)
      const same = (tax_id ?? null) === (base.tax_id ?? null)
      return same ? null : { tax_id }
    }
    case COL.TIPO: {
      const tipo = parseTipoCell(t)
      if (!tipo) return null
      return tipo === base.tipo ? null : { tipo }
    }
    case COL.WA: {
      const digits = t.trim() ? digitsOnly(t) : ''
      const next = digits === '' ? null : digits
      const prev = base.whatsapp ? digitsOnly(base.whatsapp) : null
      return next === prev ? null : { whatsapp: next }
    }
    case COL.TEL: {
      const digits = t.trim() ? digitsOnly(t) : ''
      const next = digits === '' ? null : digits
      const prev = base.telefone ? digitsOnly(base.telefone) : null
      return next === prev ? null : { telefone: next }
    }
    case COL.PROD: {
      const trimmed = t.trim()
      const next = trimmed === '' ? null : trimmed
      const prev = base.produtos_habituais ?? null
      return next === prev ? null : { produtos_habituais: next }
    }
    case COL.OBS: {
      const trimmed = t.trim()
      const next = trimmed === '' ? null : trimmed
      const prev = base.observacoes ?? null
      return next === prev ? null : { observacoes: next }
    }
    default:
      return null
  }
}

function cellForColumn(col: number, row: ClienteListItem): GridCell {
  switch (col) {
    case COL.NOME:
      return {
        kind: GridCellKind.Text,
        data: row.nome,
        displayData: row.nome,
        allowOverlay: true,
      }
    case COL.TAX: {
      const d = row.tax_id ?? ''
      return {
        kind: GridCellKind.Text,
        data: d,
        displayData: d,
        allowOverlay: true,
        copyData: d,
      }
    }
    case COL.TIPO:
      return {
        kind: GridCellKind.Text,
        data: row.tipo,
        displayData: row.tipo === 'recompra' ? 'recompra' : 'novo',
        allowOverlay: true,
      }
    case COL.WA:
      return {
        kind: GridCellKind.Text,
        data: row.whatsapp ?? '',
        displayData: row.whatsapp ?? '',
        allowOverlay: true,
      }
    case COL.TEL:
      return {
        kind: GridCellKind.Text,
        data: row.telefone ?? '',
        displayData: row.telefone ?? '',
        allowOverlay: true,
      }
    case COL.PROD:
      return {
        kind: GridCellKind.Text,
        data: row.produtos_habituais ?? '',
        displayData: row.produtos_habituais ?? '',
        allowOverlay: true,
      }
    case COL.OBS:
      return {
        kind: GridCellKind.Text,
        data: row.observacoes ?? '',
        displayData: row.observacoes ?? '',
        allowOverlay: true,
      }
    case COL.ATIVO:
      return {
        kind: GridCellKind.Boolean,
        data: row.ativo,
        allowOverlay: false,
      }
    case COL.ULTIMO: {
      const label = formatUltimoContatoLabel(row.ultimo_contato)
      return {
        kind: GridCellKind.Text,
        data: label,
        displayData: label,
        allowOverlay: false,
        readonly: true,
      }
    }
    default:
      return {
        kind: GridCellKind.Text,
        data: '',
        displayData: '',
        allowOverlay: false,
        readonly: true,
      }
  }
}

export type ClientesGlideGridProps = {
  rows: ClienteListItem[]
  drafts: Record<string, ClienteUpdate>
  onMergePatch: (id: string, fragment: ClienteUpdate) => void
}

export default function ClientesGlideGrid({ rows, drafts, onMergePatch }: ClientesGlideGridProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 400, h: 360 })

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      const w = Math.max(200, Math.floor(r.width))
      const h = Math.max(200, Math.floor(r.height))
      setSize({ w, h })
    })
    ro.observe(el)
    const r = el.getBoundingClientRect()
    setSize({ w: Math.max(200, Math.floor(r.width)), h: Math.max(200, Math.floor(r.height)) })
    return () => ro.disconnect()
  }, [])

  const displayRows = useMemo(
    () => rows.map((r) => mergedRow(r, drafts[r.id])),
    [rows, drafts]
  )

  const applyEdit = useCallback(
    (col: number, rowIndex: number, value: EditableGridCell) => {
      const base = rows[rowIndex]
      if (!base || col === COL.ULTIMO) return
      const patch = patchFromCell(col, value, mergedRow(base, drafts[base.id]))
      if (!patch || Object.keys(patch).length === 0) return
      onMergePatch(base.id, patch)
    },
    [rows, drafts, onMergePatch]
  )

  const getCellContent = useCallback(
    (cell: Item): GridCell => {
      const [col, rowIndex] = cell
      const row = displayRows[rowIndex]
      if (!row) {
        return { kind: GridCellKind.Loading, allowOverlay: false }
      }
      return cellForColumn(col, row)
    },
    [displayRows]
  )

  const validateCell = useCallback((cell: Item, newValue: EditableGridCell): boolean | EditableGridCell => {
    const [col] = cell
    if (col === COL.NOME && newValue.kind === GridCellKind.Text) {
      if (!newValue.data.trim()) return false
    }
    if (col === COL.TIPO && newValue.kind === GridCellKind.Text) {
      const p = parseTipoCell(newValue.data)
      if (!p) return false
      return { ...newValue, data: p }
    }
    if (col === COL.TAX && newValue.kind === GridCellKind.Text) {
      return taxCellEditorInputValid(newValue.data)
    }
    return true
  }, [])

  return (
    <div ref={wrapRef} className="h-[min(70vh,720px)] min-h-[360px] w-full overflow-hidden rounded-md border border-[#d4d2c8] bg-white">
      <DataEditor
        width={size.w}
        height={size.h}
        columns={GRID_COLUMNS}
        rows={displayRows.length}
        getCellContent={getCellContent}
        onCellEdited={(c, v) => {
          const [col, row] = c
          applyEdit(col, row, v)
        }}
        onCellsEdited={(edits) => {
          for (const { location, value } of edits) {
            const [col, row] = location
            applyEdit(col, row, value)
          }
          return true
        }}
        validateCell={validateCell}
        rowMarkers="number"
        rowMarkerWidth={44}
        getCellsForSelection
        keybindings={{ search: true }}
        smoothScrollX
        smoothScrollY
      />
    </div>
  )
}