import { useDriverStore } from '@/hooks/use-driver-store'
import { Badge } from '@/components/ui/Badge'
import { formatCurrencyShort } from '@/data/mockData'

export function ExpenseList() {
  const { expenses, navigate } = useDriverStore()
  const pending = expenses.filter(e => e.status === 'DRAFT')
  const approved = expenses.filter(e => e.status === 'APPROVED')
  const rejected = expenses.filter(e => e.status === 'CANCELLED')

  const statusMap: Record<string, { variant: any; label: string }> = {
    DRAFT: { variant: 'warning', label: 'Chờ duyệt' },
    APPROVED: { variant: 'success', label: 'Đã duyệt' },
    CANCELLED: { variant: 'danger', label: 'Từ chối' },
  }

  const renderCard = (e: any) => {
    const s = statusMap[e.status] ?? statusMap.DRAFT
    return (
      <div key={e.id} className="bg-[var(--theme-bg-secondary)] rounded-xl p-4 border border-[var(--theme-border-default)]">
        <div className="flex justify-between items-start mb-1">
          <span className="font-semibold text-sm text-[var(--theme-text-primary)]">{e.category}</span>
          <Badge variant={s.variant}>{s.label}</Badge>
        </div>
        <p className="text-sm text-[var(--theme-text-muted)]">{e.description}</p>
        <div className="flex justify-between mt-2 text-sm">
          <span className="text-[var(--theme-text-muted)]">{e.date}</span>
          <span className="font-bold text-[var(--theme-brand-primary)]">{formatCurrencyShort(e.amount)}</span>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex gap-0 border-b border-[var(--theme-border-default)] bg-[var(--theme-bg-secondary)]">
        {[['Chờ duyệt', pending.length], ['Đã duyệt', approved.length], ['Từ chối', rejected.length]].map(([label, count], i) => (
          <button key={label} className="flex-1 py-3 text-center text-sm font-medium border-b-2 border-transparent text-[var(--theme-text-muted)] data-[active=true]:border-[var(--theme-brand-primary)] data-[active=true]:text-[var(--theme-text-primary)]" data-active={i === 0 ? true : undefined}>
            {label} ({count})
          </button>
        ))}
      </div>
      <div className="space-y-3 p-4 pb-24">
        {pending.map(renderCard)}
      </div>
      <button
        onClick={() => navigate('/driver/expenses/new')}
        className="fixed bottom-20 right-4 w-14 h-14 bg-[var(--theme-brand-primary)] text-white rounded-full shadow-lg flex items-center justify-center text-2xl z-20 active:scale-95 transition-transform"
      >+</button>
    </div>
  )
}
