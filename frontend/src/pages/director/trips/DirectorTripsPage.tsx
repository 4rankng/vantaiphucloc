import { useState } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { FilterBar, DetailModal } from '@/components/shared/DataList'
import { TripCard } from '@/components/modules/TripCard'
import { TripTable } from '@/components/modules/TripTable'
import { TripDetail } from '@/components/modules/TripDetail'
import { mockJobs, type JobStatus } from '@/data/mockData'

const filters = [
  { key: 'status', label: 'Trạng thái', options: [
    { value: 'all', label: 'Tất cả' }, { value: 'IN_PROGRESS', label: 'Đang chạy' },
    { value: 'PLANNED', label: 'Lên kế hoạch' }, { value: 'COMPLETED', label: 'Hoàn thành' },
  ]},
]

export default function DirectorTripsPage() {
  const isMobile = useIsMobile()
  const [detailId, setDetailId] = useState<string | null>(null)
  const detail = mockJobs.find(j => j.id === detailId)

  return (
    <div className="space-y-4">
      <FilterBar searchPlaceholder="Tìm mã chuyến, tài xế, tuyến..." filters={filters} />
      {isMobile ? (
        <div className="space-y-2">
          {mockJobs.map(j => (
            <TripCard key={j.id} data={j as any} onClick={() => setDetailId(j.id)} />
          ))}
        </div>
      ) : (
        <TripTable data={mockJobs as any} onRowClick={setDetailId} />
      )}
      <DetailModal open={!!detail} onOpenChange={() => setDetailId(null)} title={`Chuyến ${detailId || ''}`}>
        {detail && <TripDetail data={detail as any} />}
      </DetailModal>
    </div>
  )
}
