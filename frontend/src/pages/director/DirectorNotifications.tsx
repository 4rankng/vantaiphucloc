import { NotificationList, type AppNotification } from '@/components/shared/NotificationList'
import { useNotifications } from '@/hooks/use-queries'

export function DirectorNotifications() {
  const { data: notifications = [] } = useNotifications()

  return (
    <div className="space-y-5">
      <NotificationList notifications={notifications as AppNotification[]} />
    </div>
  )
}
