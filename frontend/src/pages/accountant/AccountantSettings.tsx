import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { Settings, Wallet, Tag, Users, UserCog, Truck, ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'

type SettingSection = {
  key: string
  label: string
  desc: string
  icon: React.ElementType
  path: string
  color: string
}

const SECTIONS: SettingSection[] = [
  { key: 'salary', label: 'Kỳ lương', desc: 'Cấu hình kỳ tính lương tài xế', icon: Wallet, path: '/accountant/settings/salary', color: 'var(--theme-status-success)' },
  { key: 'pricing', label: 'Bảng giá', desc: 'Giá vận chuyển theo tuyến & khách hàng', icon: Tag, path: '/accountant/settings/pricing', color: 'var(--theme-brand-primary)' },
  { key: 'clients', label: 'Khách hàng', desc: 'Quản lý thông tin khách hàng', icon: Users, path: '/accountant/settings/clients', color: 'var(--theme-status-info)' },
  { key: 'vendors', label: 'Nhà thầu', desc: 'Quản lý đơn vị vận chuyển', icon: Truck, path: '/accountant/settings/vendors', color: 'var(--theme-status-warning)' },
  { key: 'users', label: 'Người dùng', desc: 'Tạo & quản lý tài khoản', icon: UserCog, path: '/accountant/settings/users', color: 'var(--theme-text-secondary)' },
]

function SettingCard({ section }: { section: SettingSection }) {
  const navigate = useNavigate()
  const Icon = section.icon
  return (
    <button
      onClick={() => navigate(section.path)}
      className="card-interactive p-4 flex items-start gap-4 text-left"
    >
      <div
        className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `color-mix(in srgb, ${section.color} 12%, transparent)` }}
      >
        <Icon className="h-5 w-5" style={{ color: section.color }} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{section.label}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>{section.desc}</p>
      </div>
    </button>
  )
}

function SectionHeader({ section }: { section: SettingSection | undefined }) {
  const navigate = useNavigate()
  if (!section) return null
  const Icon = section.icon
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => navigate('/accountant/settings')}
        className="h-8 w-8 rounded-lg flex items-center justify-center transition hover:opacity-70"
        style={{ background: 'var(--theme-bg-tertiary)' }}
      >
        <ArrowLeft className="h-4 w-4" style={{ color: 'var(--theme-text-muted)' }} />
      </button>
      <div
        className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `color-mix(in srgb, ${section.color} 12%, transparent)` }}
      >
        <Icon className="h-4 w-4" style={{ color: section.color }} />
      </div>
      <div>
        <h1 className="typo-h1">{section.label}</h1>
        <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{section.desc}</p>
      </div>
    </div>
  )
}

export function AccountantSettings() {
  const location = useLocation()
  const isHome = location.pathname === '/accountant/settings'
  const activeSection = SECTIONS.find(s => location.pathname.startsWith(s.path))

  if (!isHome && activeSection) {
    return (
      <div className="space-y-5">
        <SectionHeader section={activeSection} />
        <Outlet />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'var(--theme-brand-primary-light)' }}
        >
          <Settings className="h-6 w-6" style={{ color: 'var(--theme-brand-primary)' }} />
        </div>
        <div>
          <h1 className="typo-display">Cài đặt</h1>
          <p className="typo-body-sm mt-0.5">Cấu hình hệ thống và dữ liệu nền</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {SECTIONS.map(section => (
          <SettingCard key={section.key} section={section} />
        ))}
      </div>
    </div>
  )
}
