import { useDriverStore } from '@/hooks/use-driver-store'
import { useAuth } from '@/contexts/AuthContext'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/Sheet/Sheet'
import { Settings, HelpCircle, FileText, UserCircle, Phone } from 'lucide-react'

export function MoreMenu() {
  const { user } = useAuth()
  const { navigate, driver } = useDriverStore()
  const initials = driver.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  const handleSettings = () => alert('Tính năng đang phát triển')
  const handleHelp = () => alert('Gọi 1900-xxxx để được hỗ trợ')
  const handleRules = () => alert('Quy định vận tải sẽ được cập nhật sớm')

  const menuItems = [
    { icon: Settings, label: 'Cài đặt', action: handleSettings },
    { icon: HelpCircle, label: 'Trợ giúp', action: handleHelp },
    { icon: FileText, label: 'Quy định', action: handleRules },
  ]

  return (
    <div className="p-4 space-y-4 pb-24">
      <h2 className="text-lg font-bold" style={{ color: 'var(--theme-text-primary)' }}>Thêm</h2>
      {user && (
        <div className="rounded-xl p-4 border" style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
            >
              {initials}
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{user.name}</p>
              <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{user.id}</p>
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        {menuItems.map(({ icon: Icon, label, action, danger }) => (
          <button
            key={label}
            onClick={action}
            className="rounded-xl p-5 border flex flex-col items-center gap-2 active:scale-95 transition-transform min-h-[80px] justify-center"
            style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)' }}
          >
            <Icon
              className="w-6 h-6"
              style={{ color: danger ? 'var(--theme-status-error)' : 'var(--theme-text-secondary)' }}
            />
            <span className="text-sm font-medium" style={{ color: danger ? 'var(--theme-status-error)' : 'var(--theme-text-primary)' }}>{label}</span>
          </button>
        ))}
      </div>
      <p className="text-center text-xs mt-6 pb-4" style={{ color: 'var(--theme-text-muted)' }}>v2026.04.21.7</p>
    </div>
  )
}
