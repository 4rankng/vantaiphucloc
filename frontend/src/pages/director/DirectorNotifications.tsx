import { useState, useEffect } from 'react'
import { apiClient } from '@/services/api'
import { NotificationList, type AppNotification } from '@/components/shared/NotificationList'
import { PageHeader } from '@/components/shared/PageHeader'

export function DirectorNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])

  useEffect(() => {
    apiClient.getNotifications().then(res => {
      if (res.success) setNotifications(res.data as AppNotification[])
    }).catch((err) => { console.error('Failed to load notifications:', err) })
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length
  const subtitle = notifications.length === 0
    ? 'Không có thông báo'
    : unreadCount > 0
      ? `${unreadCount} thông báo chưa đọc`
      : `${notifications.length} thông báo`

  return (
    <div className="space-y-5">
      <PageHeader title="Thông báo" subtitle={subtitle} />
      <NotificationList notifications={notifications} />
    </div>
  )
}
