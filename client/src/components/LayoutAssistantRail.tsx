import { useCallback, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Bot, ChevronLeft, ChevronRight } from 'lucide-react'
import { CrmAssistantPanel } from '@/components/CrmAssistantPanel'
import { Button } from '@/components/ui/button'
import { useAssistantDock } from '@/contexts/AssistantDockContext'
import { buildAssistantPanelProps } from '@/lib/assistantVariants'
import { ASSISTANT_RAIL_COLLAPSED_KEY } from '@/lib/storageKeys'
import { cn } from '@/lib/utils'

function readRailCollapsed(): boolean {
  try {
    const v = localStorage.getItem(ASSISTANT_RAIL_COLLAPSED_KEY)
    if (v !== null) return v === '1'
  } catch {
    /* ignore */
  }
  // Sem preferência gravada: no telefone começa recolhido (mais espaço para o CRM).
  if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
    return true
  }
  return false
}

export default function LayoutAssistantRail() {
  const { pathname } = useLocation()
  const { pageConfig } = useAssistantDock()
  const [collapsed, setCollapsed] = useState(readRailCollapsed)

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(ASSISTANT_RAIL_COLLAPSED_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const effective = useMemo(() => {
    if (pageConfig) return pageConfig
    return {
      variant: 'generic' as const,
      contextJson: JSON.stringify({ rota: pathname }),
    }
  }, [pageConfig, pathname])

  const panelProps = useMemo(
    () => buildAssistantPanelProps(effective.variant, effective.contextJson),
    [effective.variant, effective.contextJson]
  )

  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col border-l border-border bg-sidebar transition-[width] duration-200 ease-out',
        collapsed ? 'w-[52px]' : 'w-[min(480px,92vw)] max-w-[520px]'
      )}
      aria-label="Assistente de IA"
    >
      <div
        className={cn(
          'flex shrink-0 items-center border-b border-border',
          collapsed ? 'flex-col gap-1 py-2' : 'justify-between gap-2 px-2 py-1.5'
        )}
      >
        {collapsed ? (
          <>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-orange/15 text-brand-orange">
              <Bot className="h-4 w-4" aria-hidden />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 shrink-0 p-0 text-brand-mid hover:text-brand-dark"
              onClick={toggle}
              title="Expandir assistente"
              aria-expanded={false}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Expandir assistente</span>
            </Button>
          </>
        ) : (
          <>
            <span className="min-w-0 truncate pl-1 text-xs font-medium text-brand-dark">IA</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 shrink-0 p-0 text-brand-mid hover:text-brand-dark"
              onClick={toggle}
              title="Recolher assistente"
              aria-expanded
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Recolher assistente</span>
            </Button>
          </>
        )}
      </div>

      <div
        className={cn(
          'min-h-0 min-w-0 flex-1 overflow-hidden',
          collapsed && 'pointer-events-none invisible h-0 min-h-0 flex-none'
        )}
        aria-hidden={collapsed}
      >
        <CrmAssistantPanel
          key={effective.variant}
          {...panelProps}
          className="h-full min-h-[min(360px,45dvh)] border-0 lg:min-h-0 lg:flex-1 [&>div:first-child]:hidden"
        />
      </div>
    </aside>
  )
}
