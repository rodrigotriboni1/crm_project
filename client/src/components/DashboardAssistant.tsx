import { CrmAssistantPanel } from '@/components/CrmAssistantPanel'
import { buildAssistantPanelProps } from '@/lib/assistantVariants'

type Props = {
  contextJson: string
  className?: string
}

/** Mantido para usos pontuais (ex.: modais). O layout principal usa `LayoutAssistantRail`. */
export default function DashboardAssistant({ contextJson, className }: Props) {
  return (
    <CrmAssistantPanel {...buildAssistantPanelProps('dashboard', contextJson)} className={className} />
  )
}
