import { useEffect, useState, useMemo, useCallback } from 'react'
import { Users, Truck, TrendingUp, TrendingDown, UserCircle, Building2, Handshake, Receipt, Briefcase, Trophy, MoreHorizontal, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '@/services/api'
import { formatCurrencyFull as formatCurrency } from '@/data/domain'
import type { WorkOrder } from '@/data/domain'
import { useAuth } from '@/contexts/AuthContext'

const compact = (n: number) =>
  n >= 1e9 ? (n / 1e9).toFixed(2) + ' tỷ' : n >= 1e6 ? (n / 1e6).toFixed(1) + ' tr' : n.toLocaleString('vi-VN')

const fmt = (n: number) => n.toLocaleString('vi-VN') + '₫'

export function DirectorDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [menu, setMenu] = useState(false)
  const [jobs, setJobs] = useState<WorkOrder[]>([])
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() + 1 }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    apiClient.getWorkOrders()
      .then((jRes) => {
        if (!cancelled) {
          if (jRes.success) setJobs(jRes.data)
          setLoading(false)
        }
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const monthlyJobs = useMemo(() => {
    return jobs.filter(j => {
      const d = new Date(j.createdAt)
      return d.getFullYear() === month.year && d.getMonth() + 1 === month.month
    })
  }, [jobs, month])

  const totalRevenue = useMemo(() => monthlyJobs.reduce((s, j) => s + j.unitPrice, 0), [monthlyJobs])
  const totalDriverEarning = useMemo(() => monthlyJobs.reduce((s, j) => s + j.earning, 0), [monthlyJobs])
  const profit = totalRevenue - totalDriverEarning

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

  const clientBreakdown = useMemo(() => {
    const map = new Map<number, { name: string; trips: number; revenue: number }>()
    for (const j of monthlyJobs) {
      const existing = map.get(j.clientId) ?? { name: j.clientName, trips: 0, revenue: 0 }
      existing.trips++
      existing.revenue += j.unitPrice
      map.set(j.clientId, existing)
    }
    const clients = Array.from(map.entries()).map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
    const maxRev = clients[0]?.revenue ?? 1
    return clients.map(c => ({ ...c, pct: c.revenue / maxRev }))
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

  const unmatchedCount = useMemo(() => monthlyJobs.filter(j => j.status === 'PENDING').length, [monthlyJobs])

  return (
    <div className="pb-8 space-y-5">
      {/* Greeting */}
      <section>
        <div className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
          Tổng quan tháng {month.month}/{month.year}
        </div>
        <h1 className="font-display text-xl font-bold" style={{ color: 'var(--theme-text-primary)' }}>
          {user?.name ?? 'Giám đốc'}
        </h1>
      </section>

      {/* Month navigator */}
      <div className="flex items-center gap-2">
        <button
          onClick={prevMonth}
          className="flex h-7 w-7 items-center justify-center rounded-lg transition active:scale-90"
          style={{ color: 'var(--theme-text-primary)' }}
          aria-label="Tháng trước"
        >
          <TrendingDown className="h-4 w-4" />
        </button>
        <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>
          Tháng {month.month}/{month.year}
        </span>
        <button
          onClick={nextMonth}
          className="flex h-7 w-7 items-center justify-center rounded-lg transition active:scale-90"
          style={{ color: 'var(--theme-text-primary)' }}
          aria-label="Tháng sau"
        >
          <TrendingUp className="h-4 w-4" />
        </button>
      </div>

      {/* Hero KPI card */}
      <section
        className="rounded-3xl border p-5 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--theme-brand-primary) 8%, transparent), var(--surface-bg), color-mix(in srgb, var(--theme-brand-primary) 12%, transparent))',
          borderColor: 'color-mix(in srgb, var(--theme-brand-primary) 20%, transparent)',
        }}
      >
        <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-brand-primary)' }}>
          Lợi nhuận tháng
        </div>
        <div className="mt-1 font-display text-3xl font-bold tracking-tight" style={{ color: 'var(--theme-text-primary)' }}>
          {loading ? '...' : compact(profit)} ₫
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div
            className="rounded-xl p-3 ring-1"
            style={{ background: 'color-mix(in srgb, var(--surface-bg) 80%, transparent)', ringColor: 'var(--surface-border)' }}
          >
            <div className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>Doanh thu</div>
            <div className="font-display text-base font-bold" style={{ color: 'var(--theme-text-primary)' }}>
              {loading ? '...' : compact(totalRevenue)}₫
            </div>
          </div>
          <div
            className="rounded-xl p-3 ring-1"
            style={{ background: 'color-mix(in srgb, var(--surface-bg) 80%, transparent)', ringColor: 'var(--surface-border)' }}
          >
            <div className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>Chi phí tài xế</div>
            <div className="font-display text-base font-bold" style={{ color: 'var(--theme-text-primary)' }}>
              {loading ? '...' : compact(totalDriverEarning)}₫
            </div>
          </div>
        </div>
      </section>

      {/* Stat tiles */}
      <section className="grid grid-cols-2 gap-3">
        {[
          { i: Truck, label: 'Chuyến đã chạy', value: String(monthlyJobs.length), iconBg: 'color-mix(in srgb, var(--theme-status-info, #3b82f6) 12%, transparent)', iconColor: 'var(--theme-status-info, #3b82f6)' },
          { i: Briefcase, label: 'Trung bình/chuyến', value: monthlyJobs.length > 0 ? compact(Math.round(totalRevenue / monthlyJobs.length)) : '0', iconBg: 'color-mix(in srgb, var(--theme-status-success, #16a34a) 12%, transparent)', iconColor: 'var(--theme-status-success, #16a34a)' },
          { i: TrendingDown, label: 'Phiếu chưa ghép', value: String(unmatchedCount), iconBg: 'color-mix(in srgb, var(--theme-status-warning) 12%, transparent)', iconColor: 'var(--theme-status-warning)' },
          { i: Receipt, label: 'Lệnh chờ chốt', value: String(clientBreakdown.length), iconBg: 'color-mix(in srgb, var(--theme-status-warning) 12%, transparent)', iconColor: 'var(--theme-status-warning)' },
        ].map(s => (
          <button
            key={s.label}
            className="rounded-2xl border p-4 text-left transition active:scale-[0.98]"
            style={{ background: 'var(--surface-bg)', borderColor: 'var(--surface-border)' }}
          >
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: s.iconBg, color: s.iconColor }}
            >
              <s.i className="h-4 w-4" />
            </div>
            <div className="mt-3 font-display text-xl font-bold" style={{ color: 'var(--theme-text-primary)' }}>
              {s.value}
            </div>
            <div className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{s.label}</div>
          </button>
        ))}
      </section>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Nhân sự', path: '/director/users', icon: Users },
          { label: 'Đối tác', path: '/director/partners', icon: Handshake },
          { label: 'Bảng giá', path: '/director/pricing', icon: Receipt },
          { label: 'Lệnh ĐH', path: '/director/trips', icon: Briefcase },
        ].map(a => (
          <button
            key={a.label}
            onClick={() => navigate(a.path)}
            className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition active:scale-[0.98]"
            style={{ background: 'var(--surface-bg)', borderColor: 'var(--surface-border)', color: 'var(--theme-text-primary)' }}
          >
            <a.icon className="h-3.5 w-3.5" style={{ color: 'var(--theme-brand-primary)' }} />
            {a.label}
          </button>
        ))}
      </div>

      {/* Driver leaderboard */}
      {driverBreakdown.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="flex items-center gap-2 font-display text-base font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              <Trophy className="h-4 w-4" style={{ color: 'var(--theme-status-warning)' }} />
              Tài xế xuất sắc
            </h3>
            <button className="text-xs font-medium" style={{ color: 'var(--theme-brand-primary)' }}>Xem hết</button>
          </div>
          <div className="overflow-hidden rounded-2xl border" style={{ background: 'var(--surface-bg)', borderColor: 'var(--surface-border)' }}>
            {driverBreakdown.map((d, i) => (
              <button
                key={d.id}
                onClick={() => navigate(`/director/driver-jobs/${d.id}`)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:scale-[0.99]"
                style={{ borderBottom: i < driverBreakdown.length - 1 ? '1px solid var(--surface-border)' : 'none' }}
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full font-display text-sm font-bold"
                  style={{
                    background: i === 0
                      ? 'color-mix(in srgb, var(--theme-status-warning) 25%, transparent)'
                      : 'var(--theme-bg-tertiary)',
                    color: i === 0 ? 'var(--theme-status-warning)' : 'var(--theme-text-muted)',
                  }}
                >
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>{d.name}</div>
                  <div className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                    {d.plate} · {d.trips} chuyến
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                    {fmt(d.earning)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Client contribution */}
      {clientBreakdown.length > 0 && (
        <section>
          <h3 className="mb-3 font-display text-base font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
            Khách hàng đóng góp
          </h3>
          <div className="space-y-2">
            {clientBreakdown.map(c => (
              <button
                key={c.id}
                onClick={() => navigate(`/director/client-jobs/${c.id}`)}
                className="w-full rounded-xl border p-3 text-left transition active:scale-[0.99]"
                style={{ background: 'var(--surface-bg)', borderColor: 'var(--surface-border)' }}
              >
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-medium" style={{ color: 'var(--theme-text-primary)' }}>{c.name}</span>
                  <span style={{ color: 'var(--theme-text-muted)' }}>{fmt(c.revenue)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--theme-bg-tertiary)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${c.pct * 100}%`,
                      background: 'var(--gradient-primary)',
                    }}
                  />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {!loading && monthlyJobs.length === 0 && (
        <div className="flex flex-col items-center py-8">
          <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Không có dữ liệu tháng {month.month}/{month.year}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />)}
        </div>
      )}
    </div>
  )
}
