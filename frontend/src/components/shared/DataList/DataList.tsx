import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Pagination as UIPagination } from '@/components/ui/Pagination'

// ─── Pagination ───────────────────────────────────────────
export { UIPagination as Pagination }

// ─── Generic Detail Modal ─────────────────────────────────
interface DetailModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  children: React.ReactNode
}

export function DetailModal({ open, onOpenChange, title, children }: DetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

// ─── Mobile card wrapper ─────────────────────────────────
interface MobileListCardProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}

export function MobileListCard({ children, onClick, className }: MobileListCardProps) {
  return (
    <div className={cn(
      'card rounded-xl p-4 animate-fade-slide-up',
      onClick && 'cursor-pointer hover:shadow-lg transition-shadow active:scale-[0.99]',
      className
    )}>
      {children}
    </div>
  )
}
