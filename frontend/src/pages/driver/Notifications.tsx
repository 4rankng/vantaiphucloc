import { useDriverStore } from '@/hooks/use-driver-store'
import { BackButton } from '@/components/shared/BackButton'
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
        className="w-full text-left rounded-2xl p-4 card-lift"
        style={{
          background: 'var(--theme-bg-secondary)',
          boxShadow: 'var(--theme-shadow-card)',
          opacity: n.read ? 0.65 : 1,
        }}
      >
        <div className="flex gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: n.read ? 'var(--theme-bg-tertiary)' : 'var(--theme-brand-primary-light)' }}
          >
            <Icon className="w-5 h-5" style={{ color: n.read ? 'var(--theme-text-muted)' : 'var(--theme-brand-primary)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>{n.title}</p>
              {!n.read && (
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ml-2" style={{ background: 'var(--theme-brand-primary)' }} />
              )}
            </div>
            <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--theme-text-secondary)' }}>{n.message}</p>
            <p className="text-[11px] mt-1.5" style={{ color: 'var(--theme-text-muted)' }}>{formatTime(n.timestamp)}</p>
          </div>
        </div>
      </button>
    )
  }

  return (
    <div className="p-4 space-y-5 pb-24">
      <BackButton />
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold" style={{ color: 'var(--theme-text-primary)' }}>Thông báo</h2>
        {unread.length > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllNotificationsRead} className="text-xs font-semibold">
            <CheckCheck className="w-3.5 h-3.5 mr-1" />
            Đọc tất cả
          </Button>
        )}
      </div>

      {unread.length > 0 && (
        <>
          <span className="text-xs font-bold block" style={{ color: 'var(--theme-text-secondary)' }}>
            Chưa đọc ({unread.length})
          </span>
          <div className="space-y-2.5">{unread.map(renderNotif)}</div>
        </>
      )}

      {read.length > 0 && (
        <>
          <span className="text-xs font-bold block" style={{ color: 'var(--theme-text-secondary)' }}>
            Đã đọc
          </span>
          <div className="space-y-2.5">{read.map(renderNotif)}</div>
        </>
      )}

      {notifications.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--theme-bg-tertiary)' }}>
            <BellOff className="w-7 h-7" style={{ color: 'var(--theme-text-muted)', opacity: 0.4 }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--theme-text-secondary)' }}>Không có thông báo</p>
        </div>
      )}
    </div>
  )
}
