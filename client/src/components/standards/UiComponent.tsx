import * as React from 'react'
import type { FieldDefinition } from '@/types/fields'
import { fieldLabelText } from '@/types/fields'
import { getFieldMask } from '@/lib/formatters'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SelectNative } from '@/components/ui/select-native'
import { cn } from '@/lib/utils'

export type UiComponentProps = {
  field: FieldDefinition
  value: string
  onChange: (next: string) => void
  error?: string
  /** Sobrescreve `field.id` para o atributo `id` do input */
  htmlId?: string
  className?: string
  /** Repassado ao input/textarea/select (ex.: gravar ao sair do campo) */
  onControlBlur?: () => void
  required?: boolean
  /** Classes extra no controlo (não no wrapper do label) */
  controlClassName?: string
  minLength?: number
}

function inputTypeForKind(kind: FieldDefinition['kind']): React.HTMLInputTypeAttribute {
  switch (kind) {
    case 'email':
      return 'email'
    case 'password':
      return 'password'
    case 'tel':
    case 'phone':
      return 'tel'
    case 'document':
    case 'cep':
      return 'text'
    case 'number':
      return 'number'
    case 'currency':
      return 'text'
    case 'date':
      return 'date'
    case 'datetime-local':
      return 'datetime-local'
    default:
      return 'text'
  }
}

function isShortTextKind(kind: FieldDefinition['kind']): boolean {
  return kind === 'text' || kind === 'shortText'
}

/**
 * Renderiza um campo de formulário a partir de um `FieldDefinition`,
 * mantendo label, descrição, erro e controle alinhados ao design system.
 */
export function UiComponent({
  field,
  value,
  onChange,
  error,
  htmlId,
  className,
  onControlBlur,
  required,
  controlClassName,
  minLength,
}: UiComponentProps) {
  const id = htmlId ?? field.id
  const disabled = field.disabled
  const label = fieldLabelText(field)
  const mask = getFieldMask(field)

  const control = (() => {
    if (mask) {
      return (
        <Input
          id={id}
          disabled={disabled}
          type={inputTypeForKind(field.kind)}
          inputMode="numeric"
          autoComplete={field.autoComplete}
          placeholder={field.placeholder}
          value={mask.displayValue(value)}
          onChange={(e) => onChange(mask.normalizeInput(e.target.value))}
          onBlur={onControlBlur}
          required={required}
          className={controlClassName}
        />
      )
    }

    switch (field.kind) {
      case 'textarea':
      case 'longText':
      case 'json': {
        const isJson = field.kind === 'json'
        return (
          <Textarea
            id={id}
            disabled={disabled}
            placeholder={field.placeholder}
            rows={field.rows ?? (isJson ? 6 : 4)}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onControlBlur}
            autoComplete={field.autoComplete}
            required={required}
            className={cn(
              isJson && 'h-[11rem] min-h-[11rem] max-h-[11rem] font-mono text-xs',
              controlClassName
            )}
          />
        )
      }
      case 'select':
        return (
          <SelectNative
            id={id}
            disabled={disabled}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onControlBlur}
            required={required}
            className={controlClassName}
          >
            {field.placeholder && <option value="">{field.placeholder}</option>}
            {(field.options ?? []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </SelectNative>
        )
      default:
        return (
          <Input
            id={id}
            disabled={disabled}
            type={inputTypeForKind(field.kind)}
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onControlBlur}
            autoComplete={field.autoComplete}
            inputMode={field.kind === 'currency' ? 'decimal' : undefined}
            maxLength={isShortTextKind(field.kind) ? field.maxLength : undefined}
            min={field.min}
            max={field.max}
            step={field.step ?? (field.kind === 'currency' ? 'any' : undefined)}
            required={required}
            minLength={minLength}
            className={controlClassName}
          />
        )
    }
  })()

  return (
    <div className={cn('space-y-1', className)}>
      <Label htmlFor={id}>{label}</Label>
      {field.description && (
        <p className="text-xs text-muted-foreground -mt-0.5">{field.description}</p>
      )}
      {control}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
