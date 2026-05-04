import { NotificationList, type AppNotification } from '@/components/shared/NotificationList'
import { useNotifications } from '@/hooks/use-queries'

export function AccountantNotifications() {
  const { data: notifications = [], isLoading: loading } = useNotifications()

  return (
    <div>
      <div className="mb-6">
        <h1 className="typo-display">Thông báo</h1>
        <p className="typo-body-sm mt-1">Tất cả tin nhắn và cập nhật</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="card p-4 skeleton-shimmer"
              style={{ height: '80px', background: 'var(--theme-bg-secondary)' }}
            />
          ))}
        </div>
      ) : (
        <NotificationList notifications={notifications as AppNotification[]} />
      )}
    </div>
  )
}
