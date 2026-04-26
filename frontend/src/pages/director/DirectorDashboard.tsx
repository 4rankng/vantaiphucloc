import { useEffect, useState, useMemo, useCallback } from 'react'
import { Users, Truck, TrendingUp, ChevronLeft, ChevronRight, UserCircle, Building2 } from 'lucide-react'
import { apiClient } from '@/services/api'
import { formatCurrencyFull as formatCurrency } from '@/data/mockData'
import type { WorkOrder, Client, Driver } from '@/data/mockData'

interface DirectorDashboardProps {
  onManageUsers?: () => void
  onViewDriverJobs?: (driverId: string) => void
  onViewClientJobs?: (clientId: string) => void
  onViewClientPricing?: (clientId: string) => void
}

export function DirectorDashboard({ onManageUsers, onViewDriverJobs, onViewClientJobs, onViewClientPricing }: DirectorDashboardProps) {
  const [jobs, setJobs] = useState<WorkOrder[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() + 1 }
  })

  useEffect(() => {
    let cancelled = false
    Promise.all([
      apiClient.getWorkOrders(),
      apiClient.getClients(),
    ]).then(([jRes, cRes]) => {
      if (!cancelled) {
        if (jRes.success) setJobs(jRes.data)
        if (cRes.success) setClients(cRes.data)
      }
    })
    return () => { cancelled = true }
  }, [])

  // Load drivers from users store
  useEffect(() => {
    const raw = localStorage.getItem('ttransport_users')
    if (raw) {
      try {
        const users = JSON.parse(raw)
        setDrivers(users.filter((u: { role: string }) => u.role === 'driver'))
      } catch { /* */ }
    }
  }, [])

  // Filter jobs by selected month
  const monthlyJobs = useMemo(() => {
    return jobs.filter(j => {
      const d = new Date(j.createdAt)
      return d.getFullYear() === month.year && d.getMonth() + 1 === month.month
    })
  }, [jobs, month])

  // Stats
  const totalRevenue = useMemo(() => monthlyJobs.reduce((s, j) => s + j.unitPrice, 0), [monthlyJobs])
  const totalDriverEarning = useMemo(() => monthlyJobs.reduce((s, j) => s + j.earning, 0), [monthlyJobs])

  // Per-driver breakdown
  const driverBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; plate: string; trips: number; earning: number }>()
    for (const j of monthlyJobs) {
      const existing = map.get(j.driverId) ?? { name: j.driverName, plate: j.tractorPlate, trips: 0, earning: 0 }
      existing.trips++
      existing.earning += j.earning
      map.set(j.driverId, existing)
    }
    return Array.from(map.entries()).map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.earning - a.earning)
  }, [monthlyJobs])

  // Per-client breakdown
  const clientBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; trips: number; revenue: number }>()
    for (const j of monthlyJobs) {
      const existing = map.get(j.clientId) ?? { name: j.clientName, trips: 0, revenue: 0 }
      existing.trips++
      existing.revenue += j.unitPrice
      map.set(j.clientId, existing)
    }
    return Array.from(map.entries()).map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [monthlyJobs])

  const monthLabel = `Tháng ${month.month}/${month.year}`
  const prevMonth = useCallback(() => {
    setMonth(prev => {
      const m = prev.month === 1 ? 12 : prev.month - 1
      const y = prev.month === 1 ? prev.year - 1 : prev.year
      return { year: y, month: m }
    })
  }, [])
  const nextMonth = useCallback(() => {
    setMonth(prev => {
      const m = prev.month === 12 ? 1 : prev.month + 1
      const y = prev.month === 12 ? prev.year + 1 : prev.year
      return { year: y, month: m }
    })
  }, [])

  return (
    <div className="pb-8">
      {/* Stats */}
      <div className="px-4 pt-4 pb-2 grid grid-cols-2 gap-2">
        <div className="rounded-2xl p-3" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--theme-text-muted)' }}>Doanh thu</span>
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--theme-brand-primary-light)' }}>
              <TrendingUp className="w-3 h-3" style={{ color: 'var(--theme-brand-primary)' }} />
            </div>
          </div>
          <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="rounded-2xl p-3" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--theme-text-muted)' }}>Chi tài xế</span>
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--theme-brand-primary-light)' }}>
              <Truck className="w-3 h-3" style={{ color: 'var(--theme-brand-primary)' }} />
            </div>
          </div>
          <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrency(totalDriverEarning)}</p>
        </div>
      </div>

      {/* Month navigator */}
      <div className="px-4 pb-2 flex items-center justify-between">
        <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-full touch-manipulation" style={{ background: 'var(--theme-bg-secondary)' }}>
          <ChevronLeft className="w-4 h-4" style={{ color: 'var(--theme-text-primary)' }} />
        </button>
        <span className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>{monthLabel}</span>
        <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-full touch-manipulation" style={{ background: 'var(--theme-bg-secondary)' }}>
          <ChevronRight className="w-4 h-4" style={{ color: 'var(--theme-text-primary)' }} />
        </button>
      </div>

      {/* Quick actions */}
      <div className="px-4 pb-3 flex gap-2">
        <button
          onClick={onManageUsers}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold touch-manipulation"
          style={{ background: 'var(--theme-bg-secondary)', color: 'var(--theme-text-primary)', border: '1px solid var(--theme-border-default)' }}
        >
          <Users className="w-3.5 h-3.5" style={{ color: 'var(--theme-brand-primary)' }} /> Nhân sự
        </button>
      </div>

      {/* Driver KPI breakdown */}
      {driverBreakdown.length > 0 && (
        <div className="px-4 mt-4">
          <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--theme-text-muted)' }}>Theo tài xế</p>
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}>
            {driverBreakdown.map((d, i) => (
              <button
                key={d.id}
                onClick={() => onViewDriverJobs?.(d.id)}
                className="w-full flex items-center justify-between px-4 py-3 touch-manipulation card-lift"
                style={{
                  borderBottom: i < driverBreakdown.length - 1 ? '1px solid var(--theme-border-default)' : 'none',
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}>
                    <UserCircle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>{d.name}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono" style={{ color: 'var(--theme-text-muted)' }}>{d.plate}</span>
                      <span className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>·</span>
                      <span className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>{d.trips} chuyến</span>
                    </div>
                  </div>
                </div>
                <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrency(d.earning)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Client KPI breakdown */}
      {clientBreakdown.length > 0 && (
        <div className="px-4 mt-4">
          <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--theme-text-muted)' }}>Theo khách hàng</p>
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}>
            {clientBreakdown.map((c, i) => (
              <button
                key={c.id}
                onClick={() => onViewClientJobs?.(c.id)}
                className="w-full flex items-center justify-between px-4 py-3 touch-manipulation card-lift"
                style={{
                  borderBottom: i < clientBreakdown.length - 1 ? '1px solid var(--theme-border-default)' : 'none',
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}>
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>{c.name}</p>
                    <p className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>{c.trips} chuyến</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrency(c.revenue)}</p>
                  <p className="text-[10px] font-medium" style={{ color: 'var(--theme-brand-primary)' }}>Xem đơn giá →</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {monthlyJobs.length === 0 && (
        <div className="px-4 mt-8 flex flex-col items-center">
          <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Không có dữ liệu tháng {month.month}/{month.year}</p>
        </div>
      )}
    </div>
  )
}
