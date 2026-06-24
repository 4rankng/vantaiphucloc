import { NotificationList, type AppNotification } from '@/components/shared/data-display/NotificationList'
import { SubpageHeader } from '@/components/shared/navigation/SubpageHeader'
import { useNotifications } from '@/hooks/use-queries'

export function DirectorNotifications() {
  const { data: notifications = [] } = useNotifications()

  return (
    <div className="space-y-5">
      <SubpageHeader title="Thông báo" />
      <NotificationList notifications={notifications as AppNotification[]} />
    </div>
  )
}
