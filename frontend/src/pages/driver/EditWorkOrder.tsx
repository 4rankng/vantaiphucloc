import { useParams } from 'react-router-dom'
import { CreateWorkOrder } from './CreateWorkOrder'
import { useWorkOrder } from '@/hooks/use-queries'

export function EditWorkOrder() {
  const { jobId: jobIdStr } = useParams<{ jobId: string }>()
  const jobId = Number(jobIdStr)
  const { data: workOrder = null, isLoading: loading } = useWorkOrder(jobId)

  if (loading) {
    return (
      <div className="animate-pulse space-y-3 p-4">
        <div className="h-40 rounded-lg" style={{ background: 'var(--theme-bg-tertiary)' }} />
        <div className="h-6 rounded w-2/3" style={{ background: 'var(--theme-bg-tertiary)' }} />
      </div>
    )
  }

  if (!workOrder) {
    return (
      <div className="p-4 text-center py-12" style={{ color: 'var(--theme-text-muted)' }}>
        <p className="text-sm">Không tìm thấy chuyến</p>
      </div>
    )
  }

  if (workOrder.status !== 'PENDING') {
    return (
      <div className="p-4 text-center py-12" style={{ color: 'var(--theme-text-muted)' }}>
        <p className="text-sm">Chỉ có thể sửa chuyến chưa đối soát</p>
      </div>
    )
  }

  return <CreateWorkOrder existingWorkOrder={workOrder} />
}
