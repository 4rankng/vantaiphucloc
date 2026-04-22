import { useDriverStore } from '@/hooks/use-driver-store'
import { BellOff, CheckCheck } from 'lucide-react'
import { NotificationItem } from '@/components/shared/NotificationItem'

export function Notifications() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useDriverStore()

  return (
    <div className="space-y-3">
      {notifications.some(n => !n.read) && (
        <div className="flex justify-end">
          <button onClick={markAllNotificationsRead}
            className="flex items-center gap-1 text-xs font-semibold"
            style={{ color: 'var(--theme-brand-primary)' }}>
            <CheckCheck className="w-3.5 h-3.5" /> Đọc tất cả
          </button>
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="text-center py-12">
          <BellOff className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--theme-text-muted)', opacity: 0.4 }} />
          <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Không có thông báo</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {notifications.map(n => (
            <NotificationItem key={n.id} notification={n} onRead={markNotificationRead} />
          ))}
        </div>
      )}
    </div>
  )
}
