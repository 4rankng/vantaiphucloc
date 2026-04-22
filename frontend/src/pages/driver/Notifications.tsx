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

const NOTIF_COLORS: Record<string, string> = {
  reject: 'var(--theme-status-error)',
  trip: 'var(--theme-brand-primary)',
  license: 'var(--theme-status-warning)',
  approve: 'var(--theme-status-success)',
  star: 'var(--theme-status-warning)',
}

export function Notifications() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useDriverStore()

  const formatTime = (ts: string) => {
    const d = new Date(ts)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffHours = Math.floor(diffMs / 3600000)
    if (diffHours < 1) return 'Vừa xong'
    if (diffHours < 24) return `${diffHours}h`
    return d.toLocaleDateString('vi-VN')
  }

  return (
    <div className="p-4 space-y-3 pb-6">
      <div className="flex items-center justify-between">
        
        {notifications.some(n => !n.read) && (
          <button onClick={markAllNotificationsRead}
            className="flex items-center gap-1 text-xs font-semibold"
            style={{ color: 'var(--theme-brand-primary)' }}>
            <CheckCheck className="w-3.5 h-3.5" /> Đọc tất cả
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-12">
          <BellOff className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--theme-text-muted)', opacity: 0.4 }} />
          <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Không có thông báo</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {notifications.map(n => {
            const Icon = NOTIF_ICONS[n.icon] ?? Bell
            const color = NOTIF_COLORS[n.icon] ?? 'var(--theme-brand-primary)'
            return (
              <button
                key={n.id}
                onClick={() => markNotificationRead(n.id)}
                className="w-full text-left rounded-xl px-3 py-2.5 flex items-start gap-2.5 transition-colors"
                style={{
                  background: n.read ? 'transparent' : 'var(--theme-bg-secondary)',
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: n.read ? 'var(--theme-bg-tertiary)' : `${color}15` }}
                >
                  <Icon className="w-4 h-4" style={{ color: n.read ? 'var(--theme-text-muted)' : color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-xs ${n.read ? '' : 'font-semibold'} truncate`} style={{ color: 'var(--theme-text-primary)' }}>{n.title}</p>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--theme-brand-primary)' }} />
                    )}
                  </div>
                  <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: 'var(--theme-text-muted)' }}>{n.message}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--theme-text-muted)', opacity: 0.7 }}>{formatTime(n.timestamp)}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
