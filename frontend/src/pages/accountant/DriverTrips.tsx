import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkOrders } from '@/hooks/use-queries'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { WorkOrderJobCard } from '@/components/shared/WorkOrderJobCard'
import { DataTablePro, type Column } from '@/components/shared/DataTablePro'
import { StatusBadgePro } from '@/components/shared/StatusBadgePro'
import { PageContainer } from '@/components/shared/PageContainer'
import { useMonthParams } from './use-month-params'
import { Search, Calendar, Truck, Package, DollarSign } from 'lucide-react'
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
        const containerCount = row.containers.length
        const firstContainer = row.containers[0]?.containerNumber
        return (
          <div className="flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5" style={{ color: 'var(--theme-text-muted)' }} />
            <span>
              {firstContainer || '-'}
              {containerCount > 1 && (
                <span className="ml-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                  +{containerCount - 1}
                </span>
              )}
            </span>
          </div>
        )
      },
      width: '150px',
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
          <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
        ))}
      </div>
    )
  }

  // Mobile view
  if (isMobile) {
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
    <PageContainer>
      <div className="space-y-4">
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
    </PageContainer>
  )
}
