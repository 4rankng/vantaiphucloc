import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '@/services/api'
import { NotificationList, type AppNotification } from '@/components/shared/NotificationList'

export function DriverNotifications() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<AppNotification[]>([])

  useEffect(() => {
    apiClient.getNotifications().then(res => {
      if (res.success) setNotifications(res.data as AppNotification[])
    }).catch((err) => { console.error('Failed to load notifications:', err) })
  }, [])

  return (
    <div className="space-y-3">
      {/* Back button — inline in page body */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm font-medium mb-1 px-4"
        style={{ color: 'var(--theme-text-secondary)' }}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Quay lại
      </button>
      <NotificationList notifications={notifications} />
    </div>
  )
}
