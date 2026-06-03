import { NotificationList, type AppNotification } from '@/components/shared/data-display/NotificationList'
import { MobileBackHeader } from '@/components/shared/navigation/MobileBackHeader'
import { useNotifications } from '@/hooks/use-queries'

export function DriverNotifications() {
  const { data: notifications = [] } = useNotifications()

  return (
    <div className="space-y-3">
      <MobileBackHeader title="Thông báo" className="px-4" />
      <div className="px-4">
        <div className="min-h-[60vh] flex flex-col justify-center">
          <NotificationList notifications={notifications as AppNotification[]} />
        </div>
      </div>
    </div>
  )
}
