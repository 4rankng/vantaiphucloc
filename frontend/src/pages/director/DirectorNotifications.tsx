import { useState, useEffect } from 'react'
import { apiClient } from '@/services/api'
import { NotificationList, type AppNotification } from '@/components/shared/NotificationList'

export function DirectorNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])

  useEffect(() => {
    apiClient.getNotifications().then(res => {
      if (res.success) setNotifications(res.data as AppNotification[])
    }).catch((err) => { console.error('Failed to load notifications:', err) })
  }, [])

  return <NotificationList notifications={notifications} />
}
