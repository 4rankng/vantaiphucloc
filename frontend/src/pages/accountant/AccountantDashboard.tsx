import { useEffect, useState, useMemo } from 'react'
import { Users, Route, CircleDollarSign, Camera, Wallet } from 'lucide-react'
import { apiClient } from '@/services/api'
import { useAppStore } from '@/hooks/use-app-store'
import type { WorkOrder, Client } from '@/data/mockData'
import type { LucideIcon } from 'lucide-react'

const CATEGORIES: { label: string; icon: LucideIcon; path: string }[] = [
  { label: 'Khách hàng', icon: Users, path: '/accountant/clients' },
  { label: 'Cung đường', icon: Route, path: '/accountant/routes' },
  { label: 'Bảng giá', icon: CircleDollarSign, path: '/accountant/pricings' },
  { label: 'Số công', icon: Camera, path: '/accountant/work-orders' },
  { label: 'Tính lương', icon: Wallet, path: '/accountant/salary' },
]

export function AccountantDashboard() {
  const { navigate } = useAppStore()
  const [clients, setClients] = useState<Client[]>([])
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])

  useEffect(() => {
    let cancelled = false
    Promise.all([apiClient.getClients(), apiClient.getWorkOrders()])
      .then(([c, w]) => {
        if (!cancelled) {
          if (c.success) setClients(c.data)
          if (w.success) setWorkOrders(w.data)
        }
      })
    return () => { cancelled = true }
  }, [])

  const pendingCount = useMemo(() => workOrders.filter(w => w.status === 'PENDING').length, [workOrders])

  return (
    <div className="pb-6">
      {/* Stats strip */}
      <div className="px-4 pt-4 grid grid-cols-3 gap-2">
        {([
          { label: 'Khách hàng', value: clients.length, icon: Users },
          { label: 'Số công', value: workOrders.length, icon: Camera },
          { label: 'Chờ đối soát', value: pendingCount, icon: Wallet },
        ] as const).map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-center gap-2 rounded-2xl p-3"
            style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'var(--theme-brand-primary-light)' }}>
              <Icon className="w-4 h-4" style={{ color: 'var(--theme-brand-primary)' }} />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold tabular-nums leading-none" style={{ color: 'var(--theme-text-primary)' }}>{value}</p>
              <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Category grid */}
      <div className="px-4 mt-4">
        <div className="grid grid-cols-5 gap-2">
          {CATEGORIES.map(({ label, icon: Icon, path }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all active:scale-[0.95] touch-manipulation"
              style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}
            >
              <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ background: 'var(--theme-brand-primary-light)' }}>
                <Icon className="h-3.5 w-3.5" style={{ color: 'var(--theme-brand-primary)' }} />
              </div>
              <span className="text-[9px] font-medium text-center leading-tight px-0.5" style={{ color: 'var(--theme-text-primary)' }}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
