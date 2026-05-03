import { Badge } from '@/components/ui/Badge'
import { Receipt } from 'lucide-react'
import { formatCurrencyShort } from '@/data/domain'

const statusMap: Record<string, { variant: 'default' | 'success' | 'warning' | 'danger' | 'info'; label: string }> = {
  DRAFT: { variant: 'warning', label: 'Chờ duyệt' },
  APPROVED: { variant: 'success', label: 'Đã duyệt' },
  CANCELLED: { variant: 'danger', label: 'Từ chối' },
}

export function ExpenseCard({ expense, onClick }: { expense: { status: string; category: string; description?: string; amount: number }; onClick: () => void }) {
  const s = statusMap[expense.status] ?? statusMap.DRAFT
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg p-4 card-lift"
      style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--theme-bg-tertiary)' }}>
            <Receipt className="w-4 h-4" style={{ color: 'var(--theme-text-secondary)' }} />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--theme-text-primary)' }}>{expense.category}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>{expense.description || '—'}</p>
          </div>
        </div>
        <Badge variant={s.variant}>{s.label}</Badge>
      </div>
      <div className="flex justify-between items-center mt-3 pt-2.5" style={{ borderTop: '1px solid var(--theme-border-light)' }}>
        <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{expense.date}</span>
        <span className="text-[15px] font-bold" style={{ color: 'var(--theme-brand-primary)' }}>{formatCurrencyShort(expense.amount)}</span>
      </div>
    </button>
  )
}
