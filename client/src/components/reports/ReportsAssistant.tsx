import { CrmAssistantPanel } from '@/components/CrmAssistantPanel'
import { buildAssistantPanelProps } from '@/lib/assistantVariants'

type Props = {
  contextJson: string
  className?: string
}

/** Mantido para usos pontuais. O layout principal usa `LayoutAssistantRail`. */
export default function ReportsAssistant({ contextJson, className }: Props) {
  return (
    <CrmAssistantPanel {...buildAssistantPanelProps('reports', contextJson)} className={className} />
  )
}
