import { useAppStore } from '@/hooks/use-app-store'
import { Users, Route, CircleDollarSign, FileText, Receipt, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

const moreItems = [
  { label: 'Khách hàng', icon: Users, path: '/accountant/clients' },
  { label: 'Cung đường', icon: Route, path: '/accountant/routes' },
  { label: 'Đơn giá', icon: CircleDollarSign, path: '/accountant/pricings' },
  { label: 'Hóa đơn', icon: FileText, path: '/accountant/invoices' },
  { label: 'Công nợ', icon: Receipt, path: '/accountant/receivables' },
  { label: 'Chốt sổ', icon: BookOpen, path: '/accountant/period-close' },
]

export function AccountantMore() {
  const { navigate } = useAppStore()

  return (
    <div className="p-4 space-y-3">
      <h2 className="text-lg font-bold" style={{ color: 'var(--theme-text-primary)' }}>Thêm</h2>
      <div className="space-y-1">
        {moreItems.map(({ label, icon: Icon, path }) => (
          <button key={path} onClick={() => navigate(path)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors active:scale-[0.98] touch-manipulation"
            style={{ background: 'var(--theme-bg-secondary)', color: 'var(--theme-text-primary)' }}>
            <Icon className="h-5 w-5" style={{ color: 'var(--theme-text-muted)' }} />
            <span className="text-sm font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
