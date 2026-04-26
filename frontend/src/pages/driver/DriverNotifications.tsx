import { Bell, CheckCircle, Wallet, UserPlus } from 'lucide-react'

interface Notification {
  id: string
  type: 'work_order' | 'salary' | 'account'
  title: string
  message: string
  time: string
  read: boolean
}

const mockNotifications: Notification[] = [
  {
    id: 'N-001',
    type: 'work_order',
    title: 'Số công đã đối soát',
    message: 'Số công CONG-284731 đã được kế toán xác nhận thành công.',
    time: '10 phút trước',
    read: false,
  },
  {
    id: 'N-002',
    type: 'salary',
    title: 'Lương tháng 4 đã tính',
    message: 'Kế toán đã tính lương kỳ 01/04 - 30/04. Vui lòng kiểm tra.',
    time: '2 giờ trước',
    read: false,
  },
  {
    id: 'N-003',
    type: 'work_order',
    title: 'Số công cần kiểm tra',
    message: 'Số công CONG-664501 bị tranh chấp. Vui lòng liên hệ kế toán.',
    time: '1 ngày trước',
    read: true,
  },
  {
    id: 'N-004',
    type: 'account',
    title: 'Tài khoản được tạo',
    message: 'Tài khoản lái xe của bạn đã được tạo thành công bởi quản trị viên.',
    time: '3 ngày trước',
    read: true,
  },
]

const TYPE_CONFIG = {
  work_order: { icon: CheckCircle, color: 'var(--theme-status-success)', bg: 'var(--theme-status-success-light)' },
  salary: { icon: Wallet, color: 'var(--theme-status-warning)', bg: 'var(--theme-status-warning-light)' },
  account: { icon: UserPlus, color: 'var(--theme-status-info)', bg: 'var(--theme-status-info-light)' },
}

export function DriverNotifications() {
  const unreadCount = mockNotifications.filter(n => !n.read).length

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

        {mockNotifications.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--theme-bg-secondary)' }}>
            <Bell className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--theme-text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Không có thông báo</p>
          </div>
        ) : (
          <div className="space-y-2">
            {mockNotifications.map(n => {
              const cfg = TYPE_CONFIG[n.type]
              const NIcon = cfg.icon
              return (
                <div
                  key={n.id}
                  className="flex items-start gap-3 rounded-2xl p-3.5"
                  style={{
                    background: n.read ? 'var(--theme-bg-secondary)' : 'var(--theme-bg-secondary)',
                    boxShadow: 'var(--theme-shadow-card)',
                    borderLeft: n.read ? 'none' : `3px solid var(--theme-brand-primary)`,
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
