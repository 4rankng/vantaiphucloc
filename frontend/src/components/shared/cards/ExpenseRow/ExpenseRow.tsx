import { memo } from 'react'
import { formatCurrencyShort } from '@/data/domain'

export const ExpenseRow = memo(function ExpenseRow({ category, amount, isLast }: { category: string; amount: number; isLast: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>{category}</span>
        <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrencyShort(amount)}</span>
      </div>
      {!isLast && <div className="mx-4 border-t" style={{ borderColor: 'var(--theme-border-light)' }} />}
    </div>
  )
})
