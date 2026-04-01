import type { User } from '@supabase/supabase-js'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { OrcamentoDetailPanel } from '@/components/OrcamentoDetailPanel'

type Props = {
  user: User | null
  orcamentoId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function KanbanCardModal({ user, orcamentoId, open, onOpenChange }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <OrcamentoDetailPanel
          variant="sheet"
          user={user}
          orcamentoId={orcamentoId}
          onClose={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  )
}
