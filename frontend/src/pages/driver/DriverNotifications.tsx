import { useNavigate } from 'react-router-dom'
import { NotificationList, type AppNotification } from '@/components/shared/data-display/NotificationList'
import { useNotifications } from '@/hooks/use-queries'

export function DriverNotifications() {
  const navigate = useNavigate()
  const { data: notifications = [] } = useNotifications()

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1 px-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm font-medium shrink-0"
          style={{ color: 'var(--theme-text-secondary)' }}
          aria-label="Quay lại"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1
          className="text-base font-bold truncate"
          style={{ color: 'var(--theme-text-primary)', letterSpacing: '-0.01em' }}
        >
          Thông báo
        </h1>
      </div>
      <div className="px-4">
        <div className="min-h-[60vh] flex flex-col justify-center">
          <NotificationList notifications={notifications as AppNotification[]} />
        </div>
      </div>
    </div>
  )
}
