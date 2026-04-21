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
        className="w-full text-left rounded-2xl p-4 card-lift"
        style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}
      >
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--theme-bg-tertiary)' }}>
              <Receipt className="w-4 h-4" style={{ color: 'var(--theme-text-secondary)' }} />
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--theme-text-primary)' }}>{e.category}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>{e.description || '—'}</p>
            </div>
          </div>
          <Badge variant={s.variant}>{s.label}</Badge>
        </div>
        <div className="flex justify-between items-center mt-3 pt-2.5" style={{ borderTop: '1px solid var(--theme-border-light)' }}>
          <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{e.date}</span>
          <span className="text-[15px] font-bold" style={{ color: 'var(--theme-brand-primary)' }}>{formatCurrencyShort(e.amount)}</span>
        </div>
      </button>
    )
  }

  return (
    <div>
      {/* Tabs — pill segment */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'var(--theme-bg-tertiary)' }}>
          {tabConfigs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 py-2.5 text-center text-xs font-semibold rounded-xl transition-all"
              style={{
                background: activeTab === tab.key ? 'var(--theme-bg-secondary)' : 'transparent',
                color: activeTab === tab.key ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)',
                boxShadow: activeTab === tab.key ? 'var(--theme-shadow-sm)' : 'none',
              }}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold"
                  style={{
                    background: activeTab === tab.key ? 'var(--theme-brand-primary)' : 'var(--theme-bg-secondary)',
                    color: activeTab === tab.key ? 'var(--theme-text-on-brand)' : 'var(--theme-text-muted)',
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-3 p-4 pb-24">
        {currentItems.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--theme-bg-tertiary)' }}>
              <Inbox className="w-7 h-7" style={{ color: 'var(--theme-text-muted)', opacity: 0.4 }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--theme-text-secondary)' }}>Không có chi phí nào</p>
          </div>
        ) : (
          currentItems.map(renderCard)
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/driver/expenses/new')}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-2xl flex items-center justify-center z-20 card-lift"
        style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)', boxShadow: 'var(--theme-shadow-elevated)' }}
        aria-label="Thêm chi phí"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Detail sheet */}
      <Sheet open={!!detailExp} onOpenChange={open => !open && setDetailExp(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl h-auto pb-safe">
          {detailExp && (
            <>
              <SheetHeader className="pb-3">
                <SheetTitle className="text-base font-bold text-left">Chi tiết chi phí</SheetTitle>
                <SheetDescription className="text-left">{detailExp.id}</SheetDescription>
              </SheetHeader>
              <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--theme-bg-tertiary)' }}>
                {[
                  { label: 'Hạng mục', value: detailExp.category },
                  { label: 'Số tiền', value: formatCurrencyShort(detailExp.amount), bold: true },
                  { label: 'Ngày', value: detailExp.date },
                  { label: 'Ghi chú', value: detailExp.description || '—' },
                ].map(({ label, value, bold }, i, arr) => (
                  <div key={label}>
                    <div className="flex justify-between items-center px-4 py-3.5">
                      <span className="text-xs font-medium" style={{ color: 'var(--theme-text-secondary)' }}>{label}</span>
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
                    {i < arr.length - 1 && <div className="mx-4 border-t" style={{ borderColor: 'var(--theme-border-light)' }} />}
                  </div>
                ))}
                <div className="mx-4 border-t" style={{ borderColor: 'var(--theme-border-light)' }} />
                <div className="flex justify-between items-center px-4 py-3.5">
                  <span className="text-xs font-medium" style={{ color: 'var(--theme-text-secondary)' }}>Trạng thái</span>
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
