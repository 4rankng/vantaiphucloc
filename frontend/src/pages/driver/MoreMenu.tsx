import { useAuth } from '@/contexts/AuthContext'

export function MoreMenu() {
  const { logout, user } = useAuth()
  const items = [
    { icon: '⚙️', label: 'Cài đặt' },
    { icon: '❓', label: 'Trợ giúp' },
    { icon: '📋', label: 'Quy định' },
    { icon: '🚪', label: 'Đăng xuất', action: logout },
  ]

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold">Thêm</h2>
      {user && (
        <div className="bg-[var(--theme-bg-secondary)] rounded-xl p-4 border border-[var(--theme-border-default)]">
          <p className="font-semibold">{user.name}</p>
          <p className="text-sm text-[var(--theme-text-muted)]">{user.id}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {items.map(item => (
          <button
            key={item.label}
            onClick={item.action}
            className="bg-[var(--theme-bg-secondary)] rounded-xl p-5 border border-[var(--theme-border-default)] flex flex-col items-center gap-2 active:scale-95 transition-transform min-h-[80px] justify-center"
          >
            <span className="text-2xl">{item.icon}</span>
            <span className="text-sm font-medium text-[var(--theme-text-primary)]">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
