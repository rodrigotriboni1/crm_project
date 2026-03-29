import { Phone, MessageCircle, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { telHrefBrazil, whatsappHrefBrazil } from '@/lib/phoneActionLinks'
import { cn } from '@/lib/utils'

type Props = {
  telefone: string | null | undefined
  whatsapp: string | null | undefined
  className?: string
  /** Rolar até o histórico e focar registo (callback do pai). */
  onRegistrarContato: () => void
}

/**
 * Barra fixa no detalhe do cliente: ligação, WhatsApp e atalho para histórico.
 * Só visível em `md:hidden` (controlado pelo pai).
 */
export default function ClienteQuickActionBar({
  telefone,
  whatsapp,
  className,
  onRegistrarContato,
}: Props) {
  const tel = telHrefBrazil(telefone ?? '') ?? telHrefBrazil(whatsapp ?? '')
  const wa = whatsappHrefBrazil(whatsapp ?? '') ?? whatsappHrefBrazil(telefone ?? '')

  return (
    <div
      className={cn(
        'fixed inset-x-0 z-[45] flex gap-2 border-t border-border bg-background/95 px-3 py-2 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur-sm md:hidden',
        className
      )}
      style={{
        bottom: 'calc(3.75rem + max(0.25rem, env(safe-area-inset-bottom, 0px)))',
      }}
      role="toolbar"
      aria-label="Ações rápidas do cliente"
    >
      {tel ? (
        <Button type="button" variant="secondary" className="min-h-12 min-w-0 flex-1 gap-2" asChild>
          <a href={tel}>
            <Phone className="h-5 w-5 shrink-0" aria-hidden />
            <span className="truncate">Ligar</span>
          </a>
        </Button>
      ) : (
        <Button type="button" variant="secondary" className="min-h-12 min-w-0 flex-1" disabled>
          <Phone className="h-5 w-5 shrink-0 opacity-40" aria-hidden />
          <span className="truncate">Ligar</span>
        </Button>
      )}
      {wa ? (
        <Button type="button" className="min-h-12 min-w-0 flex-1 gap-2 bg-[#25D366] text-white hover:bg-[#20BD5A]" asChild>
          <a href={wa} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-5 w-5 shrink-0" aria-hidden />
            <span className="truncate">WhatsApp</span>
          </a>
        </Button>
      ) : (
        <Button type="button" className="min-h-12 min-w-0 flex-1" disabled variant="secondary">
          <MessageCircle className="h-5 w-5 shrink-0 opacity-40" aria-hidden />
          <span className="truncate">WhatsApp</span>
        </Button>
      )}
      <Button
        type="button"
        variant="outline"
        className="min-h-12 min-w-0 flex-1 gap-2"
        onClick={onRegistrarContato}
      >
        <ClipboardList className="h-5 w-5 shrink-0" aria-hidden />
        <span className="truncate">Contato</span>
      </Button>
    </div>
  )
}
