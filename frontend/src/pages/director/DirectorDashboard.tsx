import { useEffect, useState, useMemo, useCallback } from 'react'
import { Users, Truck, TrendingUp, UserCircle, Building2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '@/services/api'
import { formatCurrencyFull as formatCurrency } from '@/data/domain'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { StatsRow } from '@/components/shared/StatsRow'
import type { WorkOrder } from '@/data/domain'

export function DirectorDashboard() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState<WorkOrder[]>([])
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() + 1 }
  })

  useEffect(() => {
    let cancelled = false
    apiClient.getWorkOrders().then((jRes) => {
      if (!cancelled) {
        if (jRes.success) setJobs(jRes.data)
      }
    })
    return () => { cancelled = true }
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
    const map = new Map<number, { name: string; plate: string; trips: number; earning: number }>()
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
    const map = new Map<number, { name: string; trips: number; revenue: number }>()
    for (const j of monthlyJobs) {
      const existing = map.get(j.clientId) ?? { name: j.clientName, trips: 0, revenue: 0 }
      existing.trips++
      existing.revenue += j.unitPrice
      map.set(j.clientId, existing)
    }
    return Array.from(map.entries()).map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [monthlyJobs])

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
      <div className="px-4 pt-4 pb-2">
        <StatsRow
          items={[
            {
              label: 'Doanh thu',
              value: formatCurrency(totalRevenue),
              icon: <TrendingUp className="w-3 h-3" style={{ color: 'var(--theme-brand-primary)' }} />,
            },
            {
              label: 'Chi tài xế',
              value: formatCurrency(totalDriverEarning),
              icon: <Truck className="w-3 h-3" style={{ color: 'var(--theme-brand-primary)' }} />,
            },
          ]}
        />
      </div>

      {/* Month navigator */}
      <div className="px-4 pb-2">
        <MonthNavigator year={month.year} month={month.month} onPrev={prevMonth} onNext={nextMonth} />
      </div>

      {/* Quick actions */}
      <div className="px-4 pb-3 flex gap-2 lg:gap-3">
        <button
          onClick={() => navigate('/director/users')}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold touch-manipulation"
          style={{ background: 'var(--theme-bg-secondary)', color: 'var(--theme-text-primary)', border: '1px solid var(--theme-border-default)' }}
        >
          <Users className="w-3.5 h-3.5" style={{ color: 'var(--theme-brand-primary)' }} /> Nhân sự
        </button>
      </div>

      {/* Desktop: side-by-side KPI panels */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-6">

      {/* Driver KPI breakdown */}
      {driverBreakdown.length > 0 && (
        <div className="px-4 mt-4">
          <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--theme-text-muted)' }}>Theo tài xế</p>
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}>
            {driverBreakdown.map((d, i) => (
              <button
                key={d.id}
                onClick={() => navigate(`/director/driver-jobs/${d.id}`)}
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
                      <span className="text-xs font-mono" style={{ color: 'var(--theme-text-muted)' }}>{d.plate}</span>
                      <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>·</span>
                      <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{d.trips} chuyến</span>
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
                onClick={() => navigate(`/director/client-jobs/${c.id}`)}
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
                    <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{c.trips} chuyến</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrency(c.revenue)}</p>
                  <p className="text-xs font-medium" style={{ color: 'var(--theme-brand-primary)' }}>Chi tiết →</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      </div>{/* end lg:grid */}

      {/* Empty state */}
      {monthlyJobs.length === 0 && (
        <div className="px-4 mt-8 flex flex-col items-center">
          <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Không có dữ liệu tháng {month.month}/{month.year}</p>
        </div>
      )}
    </div>
  )
}
