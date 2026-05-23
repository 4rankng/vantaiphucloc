import { Badge } from '@/components/ui/Badge'
import { Receipt } from 'lucide-react'
import { formatCurrencyShort } from '@/data/domain'

const statusMap: Record<string, { variant: 'default' | 'success' | 'warning' | 'danger' | 'info'; label: string }> = {
  DRAFT: { variant: 'warning', label: 'Chờ duyệt' },
  APPROVED: { variant: 'success', label: 'Đã duyệt' },
  CANCELLED: { variant: 'danger', label: 'Từ chối' },
}

export function ExpenseCard({ expense, onClick }: { expense: { status: string; category: string; description?: string; amount: number; date?: string }; onClick: () => void }) {
  const s = statusMap[expense.status] ?? statusMap.DRAFT
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl p-4 card-lift"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        boxShadow: '0 1px 4px -1px rgba(10,10,10,0.06)',
      }}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2.5">
          {/* Brand-tinted icon container — matches EmptyState / DashboardSectionHeader pattern */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'color-mix(in srgb, var(--accent) 10%, var(--surface-2))',
              border: '1px solid color-mix(in srgb, var(--accent) 18%, transparent)',
            }}
          >
            <Receipt className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          </div>
          <div className="min-w-0">
            <p
              className="font-semibold truncate"
              style={{ fontSize: '13px', letterSpacing: '-0.01em', color: 'var(--ink)' }}
            >
              {expense.category}
            </p>
            <p className="typo-meta mt-0.5 truncate">{expense.description || '—'}</p>
          </div>
        </div>
        <Badge variant={s.variant}>{s.label}</Badge>
      </div>
      <div
        className="flex justify-between items-center mt-3 pt-2.5"
        style={{ borderTop: '1px solid var(--line)' }}
      >
        <span className="typo-meta">{expense.date}</span>
        {/* nepo-num-hero: display font + tabular nums for financial figures */}
        <span
          className="nepo-num-hero"
          style={{
            fontSize: '15px',
            color: 'var(--accent)',
            letterSpacing: '-0.02em',
          }}
        >
          {formatCurrencyShort(expense.amount)}
        </span>
      </div>
    </button>
  )
}
