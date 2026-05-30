import { Bell, CheckCircle, Wallet, UserPlus, type LucideIcon } from 'lucide-react'

export interface AppNotification {
  id: string
  type: string
  title: string
  message: string
  time: string
  read: boolean
}

interface NotificationTypeConfig {
  icon: LucideIcon
  color: string
  bg: string
}

const DEFAULT_TYPE_CONFIG: NotificationTypeConfig = {
  icon: Bell,
  color: 'var(--theme-brand-primary)',
  bg: 'var(--theme-brand-primary-light)',
}

const BUILT_IN_TYPE_CONFIG: Record<string, NotificationTypeConfig> = {
  work_order: { icon: CheckCircle, color: 'var(--theme-status-success)', bg: 'var(--theme-status-success-light)' },
  salary:     { icon: Wallet,      color: 'var(--theme-status-warning)', bg: 'var(--theme-status-warning-light)' },
  account:    { icon: UserPlus,    color: 'var(--theme-status-info)',    bg: 'var(--theme-status-info-light)' },
}

interface NotificationListProps {
  notifications: AppNotification[]
  /** Optional extra type configs to merge with built-in ones */
  typeConfig?: Record<string, NotificationTypeConfig>
  emptyLabel?: string
}

function formatTime(ts: string): string {
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ts
  const diffHours = Math.floor((Date.now() - d.getTime()) / 3600000)
  if (diffHours < 1) return 'Vừa xong'
  if (diffHours < 24) return `${diffHours} giờ trước`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays} ngày trước`
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function NotificationList({ notifications, typeConfig, emptyLabel = 'Không có thông báo' }: NotificationListProps) {
  const merged = { ...BUILT_IN_TYPE_CONFIG, ...typeConfig }
  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="pb-6">
      {unreadCount > 0 && (
        <div className="mb-4">
          <span
            className="inline-flex px-3 py-1 text-xs font-semibold rounded-full"
            style={{ background: 'var(--theme-status-error-light)', color: 'var(--theme-status-error)' }}
          >
            {unreadCount} chưa đọc
          </span>
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="card p-8 text-center" style={{ background: 'var(--theme-bg-secondary)' }}>
          <div
            className="flex items-center justify-center rounded-full mx-auto mb-3 h-14 w-14"
            style={{ background: 'var(--theme-bg-tertiary)' }}
          >
            <Bell className="w-7 h-7" style={{ color: 'var(--theme-text-muted)' }} />
          </div>
          <p className="typo-body font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
            {emptyLabel}
          </p>
          <p className="typo-body-sm mt-1" style={{ color: 'var(--theme-text-muted)' }}>
            Thông báo mới sẽ xuất hiện ở đây
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(n => {
            const cfg = merged[n.type] ?? DEFAULT_TYPE_CONFIG
            const NIcon = cfg.icon
            return (
              <div
                key={n.id}
                className="card-interactive p-4 flex items-start gap-3"
                style={{
                  background: 'var(--theme-bg-secondary)',
                  borderColor: n.read ? 'var(--theme-border-default)' : 'var(--theme-brand-primary)',
                  borderWidth: n.read ? '1px' : '1px',
                }}
              >
                <div
                  className="flex items-center justify-center shrink-0 rounded-full"
                  style={{
                    width: '36px',
                    height: '36px',
                    background: cfg.bg,
                  }}
                >
                  <NIcon className="w-5 h-5" style={{ color: cfg.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="typo-body font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                      {n.title}
                    </p>
                    {!n.read && (
                      <div
                        className="shrink-0 mt-1.5 rounded-full"
                        style={{
                          width: '8px',
                          height: '8px',
                          background: 'var(--theme-brand-primary)',
                        }}
                      />
                    )}
                  </div>
                  <p className="typo-body-sm mb-1">{n.message}</p>
                  <p className="typo-meta">{formatTime(n.time)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
