import { useState, useEffect, useMemo } from 'react'
import { Plus, Calendar } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/services/api'
import { formatCurrencyFull, type WorkOrder } from '@/data/domain'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { WorkOrderCard } from '@/components/shared/WorkOrderCard'
import { FloatingActionButton } from '@/components/shared/FloatingActionButton'
import { StatsRow } from '@/components/shared/StatsRow'
export function DriverHome() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)

  // Month navigator state — default current month
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  useEffect(() => {
    let cancelled = false
    apiClient.getWorkOrders({ driverId: user!.id }).then(res => {
      if (!cancelled && res.success) setWorkOrders(res.data)
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [user!.id])

  const handlePrevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const handleNextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  // Filter jobs by selected month
  const filteredJobs = useMemo(() => {
    const start = new Date(year, month, 1).toISOString()
    const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString()
    return workOrders.filter(w => w.createdAt >= start && w.createdAt <= end)
  }, [workOrders, year, month])

  const totalEarnings = useMemo(() =>
    filteredJobs.reduce((sum, w) => sum + w.earning, 0),
    [filteredJobs],
  )

  return (
    <div className="pb-20 space-y-4">
      <StatsRow
        items={[
          { label: 'Thu nhập', value: formatCurrencyFull(totalEarnings) },
          { label: 'Số chuyến', value: filteredJobs.length },
        ]}
      />

      <MonthNavigator year={year} month={month} onPrev={handlePrevMonth} onNext={handleNextMonth} />

      <div className="space-y-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--theme-text-muted)' }}>
          Lịch sử chuyến
        </p>

        {loading ? (
          <div className="animate-pulse grid grid-cols-1 lg:grid-cols-2 gap-2.5">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 rounded-2xl" style={{ background: 'var(--theme-bg-tertiary)' }} />
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--theme-bg-secondary)' }}>
            <Calendar className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--theme-text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chưa có chuyến nào trong tháng này</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
            {filteredJobs.map(job => (
              <WorkOrderCard
                key={job.id}
                variant="driver"
                data={job}
                onClick={() => navigate(`/driver/job/${job.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB — mobile only */}
      <FloatingActionButton icon={<Plus className="w-6 h-6" />} onClick={() => navigate('/driver/work-orders/new')} label="Tạo chuyến mới" />
    </div>
  )
}
