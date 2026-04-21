import { useDriverStore } from '@/hooks/use-driver-store'
import { Button } from '@/components/ui/Button'
import { Bell, BellOff, CheckCheck, XCircle, Package, AlertTriangle, Shield, Star } from 'lucide-react'

const NOTIF_ICONS: Record<string, any> = {
  reject: XCircle,
  trip: Package,
  license: Shield,
  approve: CheckCheck,
  star: Star,
}

export function Notifications() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useDriverStore()
  const unread = notifications.filter(n => !n.read)
  const read = notifications.filter(n => n.read)

  const formatTime = (ts: string) => {
    const d = new Date(ts)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffHours = Math.floor(diffMs / 3600000)
    if (diffHours < 1) return 'Vừa xong'
    if (diffHours < 24) return `${diffHours} giờ trước`
    return d.toLocaleDateString('vi-VN')
  }

  const renderNotif = (n: any) => {
    const Icon = NOTIF_ICONS[n.icon] ?? Bell
    return (
      <button
        key={n.id}
        onClick={() => markNotificationRead(n.id)}
        className="w-full text-left rounded-xl p-4 border active:scale-[0.98] transition-transform"
        style={{
          background: n.read ? 'var(--theme-bg-secondary)' : 'var(--theme-bg-secondary)',
          borderColor: n.read ? 'var(--theme-border-default)' : 'var(--theme-brand-primary)',
          opacity: n.read ? 0.7 : 1,
        }}
      >
        <div className="flex gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--theme-bg-tertiary)' }}
          >
            <Icon className="w-4 h-4" style={{ color: 'var(--theme-text-secondary)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>{n.title}</p>
              {!n.read && (
                <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ml-2" style={{ background: 'var(--theme-brand-primary)' }} />
              )}
            </div>
            <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--theme-text-muted)' }}>{n.message}</p>
            <p className="text-[10px] mt-1" style={{ color: 'var(--theme-text-muted)' }}>{formatTime(n.timestamp)}</p>
          </div>
        </div>
      </button>
    )
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold" style={{ color: 'var(--theme-text-primary)' }}>Thông báo</h2>
        {unread.length > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllNotificationsRead} className="text-xs">
            <CheckCheck className="w-3.5 h-3.5 mr-1" />
            Đọc tất cả
          </Button>
        )}
      </div>

      {unread.length > 0 && (
        <>
          <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: 'var(--theme-text-muted)' }}>
            Chưa đọc ({unread.length})
          </span>
          <div className="space-y-2">{unread.map(renderNotif)}</div>
        </>
      )}

      {read.length > 0 && (
        <>
          <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: 'var(--theme-text-muted)' }}>
            Đã đọc
          </span>
          <div className="space-y-2">{read.map(renderNotif)}</div>
        </>
      )}

      {notifications.length === 0 && (
        <div className="text-center py-12">
          <BellOff className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--theme-text-muted)', opacity: 0.4 }} />
          <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Không có thông báo nào</p>
        </div>
      )}
    </div>
  )
}
