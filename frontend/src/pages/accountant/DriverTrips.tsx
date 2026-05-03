import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkOrders } from '@/hooks/use-queries'
import { PageHeader } from '@/components/shared/PageHeader'
import { WorkOrderJobCard } from '@/components/shared/WorkOrderJobCard'
import { ContBadge } from '@/components/shared/ContBadge'
import { DataTablePro, type Column } from '@/components/shared/DataTablePro'
import { StatusBadgePro } from '@/components/shared/StatusBadgePro'
import { useMonthParams } from './use-month-params'
import { Search, Calendar, Truck } from 'lucide-react'
import { Input } from '@/components/ui'
import { useIsMobile } from '@/hooks/use-mobile'
import type { WorkOrder } from '@/data/domain'
import { formatCurrencyFull as fmt } from '@/data/domain'

function getStatusVariant(status: string): 'pending' | 'matched' | 'completed' | 'neutral' {
  switch (status) {
    case 'PENDING': return 'pending'
    case 'MATCHED': return 'matched'
    case 'COMPLETED': return 'completed'
    default: return 'neutral'
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING': return 'Chờ ghép'
    case 'MATCHED': return 'Đã ghép'
    case 'COMPLETED': return 'Hoàn thành'
    default: return status
  }
}

export function DriverTrips() {
  const navigate = useNavigate()
  const isMobile = useIsMobile(1024)
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

  // Desktop table columns
  const columns: Column<WorkOrder>[] = [
    {
      key: 'date',
      header: 'Ngày',
      accessor: (row) => (
        <span className="flex items-center gap-1.5 text-sm">
          <Calendar className="h-3.5 w-3.5" style={{ color: 'var(--theme-text-muted)' }} />
          {row.createdAt ? new Date(row.createdAt).toLocaleDateString('vi-VN') : '-'}
        </span>
      ),
      sortable: true,
      sortKey: (row) => row.createdAt ?? '',
      width: '110px',
    },
    {
      key: 'driver',
      header: 'Tài xế',
      accessor: (row) => (
        <div className="min-w-0">
          <p className="font-medium truncate" style={{ color: 'var(--theme-text-primary)' }}>
            {row.driverName || '-'}
          </p>
          {row.tractorPlate && (
            <p className="text-xs flex items-center gap-1" style={{ color: 'var(--theme-text-muted)' }}>
              <Truck className="h-3 w-3" />
              {row.tractorPlate}
            </p>
          )}
        </div>
      ),
      sortable: true,
      sortKey: (row) => row.driverName ?? '',
    },
    {
      key: 'client',
      header: 'Khách hàng',
      accessor: (row) => (
        <div className="min-w-0">
          <p className="font-medium truncate" style={{ color: 'var(--theme-text-primary)' }}>
            {row.clientName}
          </p>
          <p className="text-xs truncate" style={{ color: 'var(--theme-text-muted)' }}>
            {row.route}
          </p>
        </div>
      ),
      sortable: true,
      sortKey: (row) => row.clientName ?? '',
    },
    {
      key: 'container',
      header: 'Container',
      accessor: (row) => {
        if (row.containers.length === 0) {
          return <span style={{ color: 'var(--theme-text-muted)' }}>—</span>
        }
        return (
          <div className="flex flex-col gap-0.5">
            {row.containers.slice(0, 2).map((c, i) => (
              <div key={i} className="flex items-center gap-1">
                <ContBadge type={c.workType} />
                <span className="text-xs font-mono" style={{ color: 'var(--theme-text-primary)' }}>
                  {c.containerNumber}
                </span>
              </div>
            ))}
          </div>
        )
      },
      width: '200px',
      hideOnMobile: true,
    },
    {
      key: 'earning',
      header: 'Thu nhập TX',
      accessor: (row) => (
        <span className="typo-mono text-sm">
          {fmt(row.earning ?? 0)}
        </span>
      ),
      sortable: true,
      sortKey: (row) => row.earning ?? 0,
      align: 'right',
      width: '120px',
      hideOnMobile: true,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      accessor: (row) => (
        <StatusBadgePro
          variant={getStatusVariant(row.status)}
          label={getStatusLabel(row.status)}
          size="sm"
        />
      ),
      width: '120px',
    },
  ]

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 rounded-lg skeleton-shimmer" />
        ))}
      </div>
    )
  }

  // Mobile view
  if (isMobile) {
    return (
      <div className="space-y-3">
        <PageHeader title="Chuyến đã đi" />

        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm tài xế, biển số, container, khách hàng..."
          className="search-pill w-full"
        />

        {filtered.length === 0 ? (
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

  // Desktop view
  return (
    <div className="space-y-5">
      <PageHeader title="Chuyến đã đi" />

      <div className="card overflow-hidden">
        <div className="flex items-center gap-3 p-3 border-b" style={{ borderColor: 'var(--theme-border-default)' }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm tài xế, biển số, container, khách hàng..."
            className="search-pill flex-1 max-w-sm"
          />
        </div>

        <div className="hidden lg:block overflow-x-auto">
          <DataTablePro
            data={filtered}
            columns={columns}
            rowKey={(row) => row.id}
            onRowClick={(row) => navigate(`/accountant/match/${row.id}`)}
            loading={loading}
            stickyHeader
            striped
            emptyState={
              <div className="py-8 text-center">
                <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                  {search ? 'Không tìm thấy chuyến nào' : 'Chưa có chuyến nào trong kỳ'}
                </p>
              </div>
            }
          />
        </div>

        <div className="lg:hidden divide-y" style={{ borderColor: 'var(--theme-border-light)' }}>
          {filtered.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                {search ? 'Không tìm thấy chuyến nào' : 'Chưa có chuyến nào trong kỳ'}
              </p>
            </div>
          ) : (
            filtered.map(job => (
              <WorkOrderJobCard
                key={job.id}
                job={job}
                status={job.status === 'PENDING' ? 'unmatched' : 'matched'}
                onClick={() => navigate(`/accountant/match/${job.id}`)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
