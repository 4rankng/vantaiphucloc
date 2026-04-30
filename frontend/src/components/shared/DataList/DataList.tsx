import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Search, SlidersHorizontal, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Pagination as UIPagination } from '@/components/ui/Pagination'

// ─── Filter Bar ───────────────────────────────────────────
interface FilterBarProps {
  searchPlaceholder?: string
  filters?: { key: string; label: string; options: { value: string; label: string }[] }[]
  onCreateClick?: () => void
  createLabel?: string
}

export function FilterBar({
  searchPlaceholder = 'Tìm kiếm...',
  filters = [],
  onCreateClick,
  createLabel = 'Tạo mới',
}: FilterBarProps) {
  const [showFilters, setShowFilters] = useState(false)

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-muted)]" />
          <Input placeholder={searchPlaceholder} className="pl-9 h-10" />
        </div>
        {filters.length > 0 && (
          <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)} className="shrink-0">
            <SlidersHorizontal size={16} />
          </Button>
        )}
        {onCreateClick && (
          <Button onClick={onCreateClick} className="shrink-0 gap-1.5 bg-[var(--theme-brand-secondary)] text-[var(--theme-brand-primary-dark)] hover:bg-gold-300 font-semibold">
            <Plus size={16} /> <span className="hidden sm:inline">{createLabel}</span>
          </Button>
        )}
      </div>
      {showFilters && filters.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-[var(--theme-border-default)] bg-[var(--theme-bg-secondary)] animate-fade-slide-up">
          {filters.map((f) => (
            <Select key={f.key}>
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <SelectValue placeholder={f.label} />
              </SelectTrigger>
              <SelectContent>
                {f.options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
          <Button variant="ghost" size="sm" className="text-xs text-[var(--theme-text-muted)]">Đặt lại</Button>
        </div>
      )}
    </div>
  )
}

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
