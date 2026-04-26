import { LayoutDashboard, Truck, CircleDollarSign, Shield } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import type { Role } from '@/data/mockData'
import { ROLE_LABELS } from '@/data/mockData'

interface RoleCard {
  role: Role
  label: string
  icon: LucideIcon
  description: string
}

const roles: RoleCard[] = [
  { role: 'superadmin', label: ROLE_LABELS.superadmin, icon: Shield, description: 'Quản lý hệ thống, tạo tài khoản Giám đốc' },
  { role: 'director', label: ROLE_LABELS.director, icon: LayoutDashboard, description: 'Xem tổng quan, báo cáo doanh thu' },
  { role: 'accountant', label: ROLE_LABELS.accountant, icon: CircleDollarSign, description: 'Quản lý khách hàng, đơn giá, lương' },
  { role: 'driver', label: ROLE_LABELS.driver, icon: Truck, description: 'Chụp ảnh công, gửi số công' },
]

export function RoleSelect() {
  const { loginAs } = useAuth()

  return (
    <div
      className="min-h-[100dvh] w-full flex items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--theme-brand-gradient)' }}
    >
      <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full" style={{ background: 'var(--theme-brand-primary)', opacity: 0.12 }} />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full" style={{ background: 'var(--theme-brand-primary)', opacity: 0.08 }} />

      <div className="absolute top-6 left-0 right-0 flex flex-col items-center z-10">
        <div
          className="h-14 w-14 rounded-2xl flex items-center justify-center mb-3"
          style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}
        >
          <Truck className="h-7 w-7" style={{ color: 'var(--theme-text-on-brand)' }} />
        </div>
        <h1 className="font-extrabold text-2xl tracking-tight" style={{ color: 'var(--theme-text-on-brand)' }}>
          TTransport
        </h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-on-brand)', opacity: 0.7 }}>
          Quản lý vận tải hàng hóa
        </p>
      </div>

      <div
        className="relative z-10 w-full max-w-[400px] rounded-3xl p-7 mx-5"
        style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-elevated)' }}
      >
        <div className="mb-6">
          <h2 className="font-bold text-xl" style={{ color: 'var(--theme-text-primary)' }}>
            Chọn vai trò
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--theme-text-secondary)' }}>
            Chọn vai trò để tiếp tục
          </p>
        </div>

        <div className="space-y-3">
          {roles.map(({ role, label, icon: Icon, description }) => (
            <button
              key={role}
              onClick={() => loginAs(role)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-colors active:scale-[0.98] touch-manipulation"
              style={{
                background: 'var(--theme-bg-tertiary)',
                border: '1px solid var(--theme-border-default)',
              }}
              aria-label={`Đăng nhập với vai trò ${label}`}
            >
              <div
                className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'var(--theme-brand-primary)', opacity: 0.9 }}
              >
                <Icon className="h-5 w-5" style={{ color: 'var(--theme-text-on-brand)' }} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{label}</p>
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--theme-text-muted)' }}>{description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
