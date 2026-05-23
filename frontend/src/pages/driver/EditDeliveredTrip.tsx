import { useParams } from 'react-router-dom'
import { CreateDeliveredTrip } from './CreateDeliveredTrip'
import { useDeliveredTrip } from '@/hooks/use-queries'

export function EditDeliveredTrip() {
  const { jobId: jobIdStr } = useParams<{ jobId: string }>()
  const jobId = Number(jobIdStr)
  const { data: deliveredTrip = null, isLoading: loading } = useDeliveredTrip(jobId)

  if (loading) {
    return (
      <div className="animate-pulse space-y-3 p-4">
        <div className="h-40 rounded-lg" style={{ background: 'var(--theme-bg-tertiary)' }} />
        <div className="h-6 rounded w-2/3" style={{ background: 'var(--theme-bg-tertiary)' }} />
      </div>
    )
  }

  if (!deliveredTrip) {
    return (
      <div className="p-4 text-center py-12" style={{ color: 'var(--theme-text-muted)' }}>
        <p className="text-sm">Không tìm thấy chuyến</p>
      </div>
    )
  }

  if (deliveredTrip.bookedTripId) {
    return (
      <div className="p-4 text-center py-12" style={{ color: 'var(--theme-text-muted)' }}>
        <p className="text-sm">Chuyến đã được ghép — không thể chỉnh sửa</p>
      </div>
    )
  }

  return <CreateDeliveredTrip existingDeliveredTrip={deliveredTrip} />
}
