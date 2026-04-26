import { Bell, Camera, Wallet, UserPlus } from 'lucide-react'

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
    title: 'Số công mới cần đối soát',
    message: 'Phạm Đức Anh vừa gửi số công CONG-331782. Cần đối soát với lệnh sản xuất.',
    time: '15 phút trước',
    read: false,
  },
  {
    id: 'N-002',
    type: 'work_order',
    title: 'Số công mới cần đối soát',
    message: 'Trần Minh Tuấn vừa gửi số công CONG-664501. Cần đối soát với lệnh sản xuất.',
    time: '1 giờ trước',
    read: false,
  },
  {
    id: 'N-003',
    type: 'salary',
    title: 'Nhắc nhở tính lương',
    message: 'Kỳ lương tháng 4 (01/04 - 30/04) sắp kết thúc. Vui lòng tính lương cho tài xế.',
    time: '3 giờ trước',
    read: true,
  },
  {
    id: 'N-004',
    type: 'account',
    title: 'Tài khoản mới được tạo',
    message: 'Giám đốc vừa tạo tài khoản lái xe mới. Vui lòng cập nhật thông tin đơn giá.',
    time: '1 ngày trước',
    read: true,
  },
]

const TYPE_CONFIG = {
  work_order: { icon: Camera, color: 'var(--theme-status-warning)', bg: 'var(--theme-status-warning-light)' },
  salary: { icon: Wallet, color: 'var(--theme-status-info)', bg: 'var(--theme-status-info-light)' },
  account: { icon: UserPlus, color: 'var(--theme-status-success)', bg: 'var(--theme-status-success-light)' },
}

export function AccountantNotifications() {
  const unreadCount = mockNotifications.filter(n => !n.read).length

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold" style={{ color: 'var(--theme-text-primary)' }}>Thông báo</h2>
        {unreadCount > 0 && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--theme-status-error-light)', color: 'var(--theme-status-error)' }}>
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
                  background: 'var(--theme-bg-secondary)',
                  boxShadow: 'var(--theme-shadow-card)',
                  borderLeft: n.read ? 'none' : `3px solid var(--theme-brand-primary)`,
                }}
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
                  <NIcon className="w-4 h-4" style={{ color: cfg.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{n.title}</p>
                    {!n.read && <div className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ background: 'var(--theme-brand-primary)' }} />}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-secondary)' }}>{n.message}</p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--theme-text-muted)' }}>{n.time}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
