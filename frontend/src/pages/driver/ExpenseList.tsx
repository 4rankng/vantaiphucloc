import { useState } from 'react'
import { useDriverStore } from '@/hooks/use-driver-store'
import { Badge } from '@/components/ui/Badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/Sheet/Sheet'
import { Input } from '@/components/ui/Input'
import { formatCurrencyShort } from '@/data/mockData'
import { Search, Plus, Receipt, ChevronRight, Inbox } from 'lucide-react'

type ExpTab = 'pending' | 'approved' | 'rejected'

export function ExpenseList() {
  const { expenses, navigate } = useDriverStore()
  const [activeTab, setActiveTab] = useState<ExpTab>('pending')
  const [detailExp, setDetailExp] = useState<any>(null)

  const pending = expenses.filter(e => e.status === 'DRAFT')
  const approved = expenses.filter(e => e.status === 'APPROVED')
  const rejected = expenses.filter(e => e.status === 'CANCELLED')

  const statusMap: Record<string, { variant: any; label: string }> = {
    DRAFT: { variant: 'warning', label: 'Chờ duyệt' },
    APPROVED: { variant: 'success', label: 'Đã duyệt' },
    CANCELLED: { variant: 'danger', label: 'Từ chối' },
  }

  const tabConfigs: { key: ExpTab; label: string; count: number; items: any[] }[] = [
    { key: 'pending', label: 'Chờ duyệt', count: pending.length, items: pending },
    { key: 'approved', label: 'Đã duyệt', count: approved.length, items: approved },
    { key: 'rejected', label: 'Từ chối', count: rejected.length, items: rejected },
  ]

  const currentItems = tabConfigs.find(t => t.key === activeTab)!.items

  const renderCard = (e: any) => {
    const s = statusMap[e.status] ?? statusMap.DRAFT
    return (
      <button
        key={e.id}
        onClick={() => setDetailExp(e)}
        className="w-full text-left rounded-xl p-4 border active:scale-[0.98] transition-transform"
        style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)' }}
      >
        <div className="flex justify-between items-start mb-1.5">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4" style={{ color: 'var(--theme-text-secondary)' }} />
            <span className="font-semibold text-sm" style={{ color: 'var(--theme-text-primary)' }}>{e.category}</span>
          </div>
          <Badge variant={s.variant}>{s.label}</Badge>
        </div>
        <p className="text-xs ml-6 mb-2" style={{ color: 'var(--theme-text-muted)' }}>{e.description || '—'}</p>
        <div className="flex justify-between items-center ml-6">
          <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{e.date}</span>
          <span className="text-sm font-bold" style={{ color: 'var(--theme-brand-primary)' }}>{formatCurrencyShort(e.amount)}</span>
        </div>
      </button>
    )
  }

  return (
    <div>
      <div className="flex gap-0 border-b" style={{ borderColor: 'var(--theme-border-default)', background: 'var(--theme-bg-secondary)' }}>
        {tabConfigs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 py-3 text-center text-sm font-medium border-b-2 transition-colors"
            style={{
              borderColor: activeTab === tab.key ? 'var(--theme-brand-primary)' : 'transparent',
              color: activeTab === tab.key ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)',
            }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>
      <div className="space-y-3 p-4 pb-24">
        {currentItems.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--theme-text-muted)', opacity: 0.4 }} />
            <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Không có chi phí nào</p>
          </div>
        ) : (
          currentItems.map(renderCard)
        )}
      </div>
      <button
        onClick={() => navigate('/driver/expenses/new')}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full flex items-center justify-center z-20 active:scale-95 transition-transform"
        style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)', boxShadow: 'var(--theme-shadow-elevated)' }}
        aria-label="Thêm chi phí"
      >
        <Plus className="w-6 h-6" />
      </button>

      <Sheet open={!!detailExp} onOpenChange={open => !open && setDetailExp(null)}>
        <SheetContent side="bottom" className="h-auto pb-safe">
          {detailExp && (
            <>
              <SheetHeader className="pb-3">
                <SheetTitle className="text-base font-semibold text-left">Chi tiết chi phí</SheetTitle>
                <SheetDescription className="text-left">{detailExp.id}</SheetDescription>
              </SheetHeader>
              <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--theme-bg-primary)', borderColor: 'var(--theme-border-default)' }}>
                {[
                  { label: 'Hạng mục', value: detailExp.category },
                  { label: 'Số tiền', value: formatCurrencyShort(detailExp.amount), bold: true },
                  { label: 'Ngày', value: detailExp.date },
                  { label: 'Ghi chú', value: detailExp.description || '—' },
                ].map(({ label, value, bold }, i, arr) => (
                  <div key={label}>
                    <div className="flex justify-between items-center px-4 py-3">
                      <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{label}</span>
                      <span
                        className="text-sm truncate ml-4"
                        style={{
                          color: bold ? 'var(--theme-brand-primary)' : 'var(--theme-text-primary)',
                          fontWeight: bold ? 700 : 500,
                        }}
                      >
                        {value}
                      </span>
                    </div>
                    {i < arr.length - 1 && <div className="mx-4 border-t" style={{ borderColor: 'var(--theme-border-default)' }} />}
                  </div>
                ))}
                <div className="mx-4 border-t" style={{ borderColor: 'var(--theme-border-default)' }} />
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Trạng thái</span>
                  <Badge variant={(statusMap[detailExp.status]?.variant ?? 'warning') as any}>
                    {statusMap[detailExp.status]?.label ?? 'Chờ duyệt'}
                  </Badge>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
