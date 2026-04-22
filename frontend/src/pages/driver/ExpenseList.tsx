import { useState } from 'react'
import { useDriverStore } from '@/hooks/use-driver-store'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/Sheet/Sheet'
import { ExpenseCard } from '@/components/shared/ExpenseCard'
import { Inbox } from 'lucide-react'
import { formatCurrencyShort } from '@/data/mockData'
import { Badge } from '@/components/ui/Badge'

type ExpTab = 'pending' | 'approved' | 'rejected'

const statusMap: Record<string, { variant: any; label: string }> = {
  DRAFT: { variant: 'warning', label: 'Chờ duyệt' },
  APPROVED: { variant: 'success', label: 'Đã duyệt' },
  CANCELLED: { variant: 'danger', label: 'Từ chối' },
}

export function ExpenseList() {
  const { expenses } = useDriverStore()
  const [activeTab, setActiveTab] = useState<ExpTab>('pending')
  const [detailExp, setDetailExp] = useState<any>(null)

  const pending = expenses.filter(e => e.status === 'DRAFT')
  const approved = expenses.filter(e => e.status === 'APPROVED')
  const rejected = expenses.filter(e => e.status === 'CANCELLED')

  const tabConfigs: { key: ExpTab; label: string; count: number; items: any[] }[] = [
    { key: 'pending', label: 'Chờ duyệt', count: pending.length, items: pending },
    { key: 'approved', label: 'Đã duyệt', count: approved.length, items: approved },
    { key: 'rejected', label: 'Từ chối', count: rejected.length, items: rejected },
  ]

  const currentItems = tabConfigs.find(t => t.key === activeTab)!.items

  return (
    <div>
      {/* Tabs — pill segment */}
      <div className="flex gap-1 p-1 rounded-2xl mb-3" style={{ background: 'var(--theme-bg-tertiary)' }}>
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

      {/* Cards */}
      <div className="space-y-3">
        {currentItems.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--theme-text-muted)', opacity: 0.4 }} />
            <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Không có chi phí nào</p>
          </div>
        ) : (
          currentItems.map(e => <ExpenseCard key={e.id} expense={e} onClick={() => setDetailExp(e)} />)
        )}
      </div>

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
                      <span className="text-sm truncate ml-4"
                        style={{ color: bold ? 'var(--theme-brand-primary)' : 'var(--theme-text-primary)', fontWeight: bold ? 700 : 500 }}>
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
