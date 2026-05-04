import { NotificationList, type AppNotification } from '@/components/shared/NotificationList'
import { PageHeader } from '@/components/shared/PageHeader'
import { useNotifications } from '@/hooks/use-queries'

export function DirectorNotifications() {
  const { data: notifications = [] } = useNotifications()
  const unreadCount = notifications.filter((n: AppNotification) => !n.read).length
  const subtitle = notifications.length === 0
    ? 'Cập nhật tự động'
    : unreadCount > 0
      ? `${unreadCount} thông báo chưa đọc`
      : `${notifications.length} thông báo`

  return (
    <div className="space-y-5">
      <PageHeader title="Thông báo" subtitle={subtitle} icon="schedule" />
      <NotificationList notifications={notifications as AppNotification[]} />
    </div>
  )
}
