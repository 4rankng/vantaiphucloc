import { useLocation, useNavigate, Outlet } from 'react-router-dom'
import { Settings, Wallet, Tag, Users, UserCog, Truck, MapPin, ChevronRight } from 'lucide-react'

type SettingSection = {
  key: string
  label: string
  desc: string
  icon: React.ElementType
  path: string
  color: string
}

const SECTION_GROUPS = [
  {
    title: 'Tài chính',
    items: [
      { key: 'salary', label: 'Kỳ lương', desc: 'Cấu hình kỳ tính lương tài xế', icon: Wallet, path: '/accountant/settings/salary', color: 'var(--theme-status-success)' },
      { key: 'pricing', label: 'Bảng giá', desc: 'Giá vận chuyển theo tuyến & khách hàng', icon: Tag, path: '/accountant/settings/pricing', color: 'var(--theme-brand-primary)' },
    ],
  },
  {
    title: 'Đối tác',
    items: [
      { key: 'clients', label: 'Khách hàng', desc: 'Quản lý thông tin khách hàng', icon: Users, path: '/accountant/settings/clients', color: 'var(--theme-status-info)' },
      { key: 'vendors', label: 'Nhà thầu', desc: 'Quản lý đơn vị vận chuyển', icon: Truck, path: '/accountant/settings/vendors', color: 'var(--theme-status-warning)' },
      { key: 'locations', label: 'Địa điểm', desc: 'Quản lý bí danh địa điểm ghép chuyến', icon: MapPin, path: '/accountant/settings/locations', color: 'var(--theme-status-success)' },
    ],
  },
  {
    title: 'Hệ thống',
    items: [
      { key: 'users', label: 'Người dùng', desc: 'Tạo & quản lý tài khoản', icon: UserCog, path: '/accountant/settings/users', color: 'var(--theme-text-secondary)' },
    ],
  },
]

function SettingCard({ section }: { section: SettingSection }) {
  const navigate = useNavigate()
  const Icon = section.icon
  return (
    <button
      onClick={() => navigate(section.path)}
      className="card-interactive p-4 flex items-center gap-4 text-left w-full"
    >
      <div
        className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `color-mix(in srgb, ${section.color} 12%, transparent)` }}
      >
        <Icon className="h-5 w-5" style={{ color: section.color }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{section.label}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>{section.desc}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
    </button>
  )
}

export function AccountantSettings() {
  const location = useLocation()
  const isHome = location.pathname === '/accountant/settings'

  if (!isHome) {
    return <Outlet />
  }

  return (
    <div className="space-y-6">
      {/* Page header with gradient band */}
      <div
        className="page-header-band rounded-xl px-5 py-5 flex items-center gap-4"
        style={{ border: '1px solid color-mix(in srgb, var(--theme-brand-primary) 10%, var(--theme-border-default))' }}
      >
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: 'var(--theme-brand-primary-light)',
            boxShadow: '0 0 0 1px color-mix(in srgb, var(--theme-brand-primary) 18%, transparent)',
          }}
        >
          <Settings className="h-6 w-6" style={{ color: 'var(--theme-brand-primary)' }} />
        </div>
        <div>
          <h1 className="typo-display">Cài đặt</h1>
          <p className="typo-body-sm mt-0.5">Quản lý kỳ lương, bảng giá, đối tác và tài khoản</p>
        </div>
      </div>

      {SECTION_GROUPS.map((group, groupIdx) => (
        <section key={group.title} className={groupIdx > 0 ? 'pt-2' : ''}>
          <div className="flex items-center gap-3 mb-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--theme-text-muted)' }}>
              {group.title}
            </p>
            <div className="flex-1 h-px" style={{ background: 'var(--theme-border-default)' }} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {group.items.map(section => (
              <SettingCard key={section.key} section={section} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
