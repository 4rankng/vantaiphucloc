import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkOrders } from '@/hooks/use-queries'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { WorkOrderJobCard } from '@/components/shared/WorkOrderJobCard'
import { useMonthParams } from './use-month-params'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui'

export function DriverTrips() {
  const navigate = useNavigate()
  const { year, month, dateFrom, dateTo, onPrev, onNext } = useMonthParams()
  const { data: workOrders = [], isLoading: loading } = useWorkOrders({ dateFrom, dateTo })
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return workOrders
    const q = search.toLowerCase()
    return workOrders.filter(w =>
      w.driverName.toLowerCase().includes(q) ||
      w.tractorPlate.toLowerCase().includes(q) ||
      w.clientName.toLowerCase().includes(q) ||
      w.containers.some(c => c.containerNumber.toLowerCase().includes(q)) ||
      (w.pickupLocation && w.pickupLocation.toLowerCase().includes(q)) ||
      (w.dropoffLocation && w.dropoffLocation.toLowerCase().includes(q))
    )
  }, [workOrders, search])

  return (
    <div className="space-y-3">
      <MonthNavigator year={year} month={month} onPrev={onPrev} onNext={onNext} />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--theme-text-muted)' }} />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm tài xế, biển số, container, khách hàng..."
          className="text-sm pl-9 h-9"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
            {search ? 'Không tìm thấy chuyến nào' : 'Chưa có chuyến nào trong kỳ'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(job => (
            <WorkOrderJobCard
              key={job.id}
              job={job}
              status={job.status === 'PENDING' ? 'unmatched' : 'matched'}
              onClick={() => navigate(`/accountant/match/${job.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
