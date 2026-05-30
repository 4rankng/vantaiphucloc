import { Bell, XCircle, Package, Shield, CheckCheck, Star, type LucideIcon } from 'lucide-react'

const NOTIF_ICONS: Record<string, LucideIcon> = {
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

export function NotificationItem({ notification, onRead }: { notification: { id: string; icon: string; read: boolean; title: string; message: string; timestamp: string }; onRead: (id: string) => void }) {
  const n = notification
  const Icon = NOTIF_ICONS[n.icon] ?? Bell
  const color = NOTIF_COLORS[n.icon] ?? 'var(--theme-brand-primary)'

  const formatTime = (ts: string) => {
    const d = new Date(ts)
    const now = new Date()
    const diffHours = Math.floor((now.getTime() - d.getTime()) / 3600000)
    if (diffHours < 1) return 'Vừa xong'
    if (diffHours < 24) return `${diffHours}h`
    return d.toLocaleDateString('vi-VN')
  }

  return (
    <button
      onClick={() => onRead(n.id)}
      className="w-full text-left rounded-xl px-3 py-2.5 flex items-start gap-2.5 transition-colors"
      style={{ background: n.read ? 'transparent' : 'var(--theme-bg-secondary)' }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: n.read ? 'var(--theme-bg-tertiary)' : `${color}15` }}>
        <Icon className="w-4 h-4" style={{ color: n.read ? 'var(--theme-text-muted)' : color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-xs ${n.read ? '' : 'font-semibold'} truncate`} style={{ color: 'var(--theme-text-primary)' }}>{n.title}</p>
          {!n.read && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--theme-brand-primary)' }} />}
        </div>
        <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--theme-text-muted)' }}>{n.message}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)', opacity: 0.7 }}>{formatTime(n.timestamp)}</p>
      </div>
    </button>
  )
}
