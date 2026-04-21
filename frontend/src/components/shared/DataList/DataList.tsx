import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Search, SlidersHorizontal, Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { DialogClose } from '@/components/ui/Dialog'

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
        <div className="flex flex-wrap gap-2 p-3 glass-card rounded-lg animate-fade-slide-up">
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
interface PaginationProps {
  total: number
  pageSize: number
  currentPage: number
  onPageChange: (page: number) => void
}

export function Pagination({ total, pageSize, currentPage, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  const pages: number[] = []
  for (let i = 1; i <= Math.min(totalPages, 5); i++) pages.push(i)

  return (
    <div className="flex items-center justify-between py-3 text-sm text-[var(--theme-text-muted)]">
      <span>Hiển thị {Math.min((currentPage - 1) * pageSize + 1, total)}–{Math.min(currentPage * pageSize, total)} / {total}</span>
      <div className="flex gap-1">
        <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>Trước</Button>
        {pages.map((p) => (
          <Button key={p} variant={p === currentPage ? 'default' : 'outline'} size="sm" onClick={() => onPageChange(p)}>{p}</Button>
        ))}
        <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)}>Sau</Button>
      </div>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────
interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="py-16 text-center">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{background:'var(--theme-bg-tertiary)'}}>
        <span style={{color:'var(--theme-text-muted)'}}>{icon}</span>
      </div>
      <p className="text-sm font-semibold text-[var(--theme-text-primary)]">{title}</p>
      <p className="text-xs text-[var(--theme-text-muted)] mt-1">{description}</p>
    </div>
  )
}

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
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
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
    <div className={`card rounded-xl p-4 animate-fade-slide-up ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow active:scale-[0.99]' : ''} ${className || ''}`}>
      {children}
    </div>
  )
}
