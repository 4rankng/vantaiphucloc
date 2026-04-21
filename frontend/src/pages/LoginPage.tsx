import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import type { Role } from '@/contexts/AuthContext'
import { ROLE_LABELS } from '@/data/mockData'

const ROLES: { key: Role; icon: string; desc: string }[] = [
  { key: 'director', icon: '👔', desc: 'Quản lý tổng thể, KPI, doanh thu' },
  { key: 'dispatcher', icon: '📋', desc: 'Phân công chuyến, theo dõi xe' },
  { key: 'accountant', icon: '🧮', desc: 'Chi phí, công nợ, hóa đơn' },
  { key: 'driver', icon: '🚛', desc: 'Chuyến xe, thu nhập, chụp ảnh' },
]

const ROUTES: Record<Role, string> = {
  director: '/director',
  dispatcher: '/dispatcher',
  accountant: '/accountant',
  driver: '/driver',
}

export default function LoginPage() {
  const { setRole } = useAuth()
  const navigate = useNavigate()

  const handleSelect = (role: Role) => {
    setRole(role)
    navigate(ROUTES[role])
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--theme-brand-primary-dark)] relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--theme-brand-secondary)]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-navy-600/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md px-4 relative z-10">
        {/* Logo */}
        <div className="text-center mb-10 animate-fade-slide-up">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-500 shadow-[0_8px_32px_rgba(212,168,57,0.25)] mb-6">
            <span className="text-4xl">🚛</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white font-display tracking-tight">
            <span className="text-[var(--theme-brand-secondary)]">T</span>Transport
          </h1>
          <p className="text-white/40 mt-2 text-sm">Hệ thống quản lý vận tải hàng hóa</p>
        </div>

        {/* Login card */}
        <div className="animate-fade-slide-up stagger-2 bg-white/[0.06] backdrop-blur-xl rounded-2xl border border-white/[0.08] p-8 shadow-2xl">
          <h2 className="text-lg font-bold text-white text-center mb-1">Chọn vai trò</h2>
          <p className="text-sm text-white/40 text-center mb-6">Đăng nhập nhanh để tiếp tục</p>

          <div className="grid grid-cols-2 gap-3">
            {ROLES.map(({ key, icon, desc }) => (
              <button
                key={key}
                onClick={() => handleSelect(key)}
                className="group flex flex-col items-center gap-2.5 p-5 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.08] hover:border-gold-400/30 transition-all duration-200 active:scale-[0.97]"
              >
                <span className="text-3xl group-hover:scale-110 transition-transform duration-200">{icon}</span>
                <span className="text-sm font-bold text-white">{ROLE_LABELS[key]}</span>
                <span className="text-[10px] text-white/30 text-center leading-tight">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-white/20 text-xs mt-6 animate-fade-in stagger-4">
          Phiên bản demo • TTransport v1.0
        </p>
      </div>
    </div>
  )
}
