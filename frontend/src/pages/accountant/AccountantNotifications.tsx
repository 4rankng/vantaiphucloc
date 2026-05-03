import { useState, useEffect } from 'react'
import { apiClient } from '@/services/api'
import { NotificationList, type AppNotification } from '@/components/shared/NotificationList'

export function AccountantNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    apiClient.getNotifications().then(res => {
      if (res.success) setNotifications(res.data as AppNotification[])
    }).catch((err) => { console.error('Failed to load notifications:', err) })
      .finally(() => { setLoading(false) })
  }, [])

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="typo-display">Thông báo</h1>
        <p className="typo-body-sm mt-1">Tất cả tin nhắn và cập nhật</p>
      </div>

      {/* Notifications list */}
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
        <NotificationList notifications={notifications} />
      )}
    </div>
  )
}
