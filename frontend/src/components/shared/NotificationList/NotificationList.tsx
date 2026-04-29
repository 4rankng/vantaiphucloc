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

export function NotificationList({ notifications, typeConfig, emptyLabel = 'Không có thông báo' }: NotificationListProps) {
  const merged = { ...BUILT_IN_TYPE_CONFIG, ...typeConfig }
  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="pb-6">
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold" style={{ color: 'var(--theme-text-primary)' }}>
            Thông báo
          </h2>
          {unreadCount > 0 && (
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--theme-status-error-light)', color: 'var(--theme-status-error)' }}
            >
              {unreadCount} chưa đọc
            </span>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--theme-bg-secondary)' }}>
            <Bell className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--theme-text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>{emptyLabel}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => {
              const cfg = merged[n.type] ?? DEFAULT_TYPE_CONFIG
              const NIcon = cfg.icon
              return (
                <div
                  key={n.id}
                  className="flex items-start gap-3 rounded-2xl p-3.5"
                  style={{
                    background: 'var(--theme-bg-secondary)',
                    boxShadow: 'var(--theme-shadow-card)',
                    borderLeft: n.read ? 'none' : '3px solid var(--theme-brand-primary)',
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: cfg.bg }}
                  >
                    <NIcon className="w-4 h-4" style={{ color: cfg.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                        {n.title}
                      </p>
                      {!n.read && (
                        <div className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ background: 'var(--theme-brand-primary)' }} />
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-secondary)' }}>
                      {n.message}
                    </p>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--theme-text-muted)' }}>
                      {n.time}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
