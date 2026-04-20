import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import type { Role } from '@/types'
import { ROLE_LABELS, ROLE_ICONS } from '@/types'

const roles: { key: Role; desc: string }[] = [
  { key: 'director', desc: 'Quản lý tổng thể, KPI, doanh thu' },
  { key: 'dispatcher', desc: 'Phân công chuyến, theo dõi xe' },
  { key: 'accountant', desc: 'Chi phí, công nợ, hóa đơn' },
  { key: 'driver', desc: 'Chuyến xe, thu nhập, chụp ảnh' },
]

export default function LoginPage() {
  const { setRole } = useAuth()
  const navigate = useNavigate()

  const handleSelect = (role: Role) => {
    setRole(role)
    const routes: Record<Role, string> = {
      director: '/director',
      dispatcher: '/dispatcher',
      accountant: '/accountant',
      driver: '/driver',
    }
    navigate(routes[role])
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a2540] via-[#0d3158] to-[#0a2540] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#d4a839] to-[#b8922e] shadow-[0_8px_32px_rgba(212,168,57,0.3)] mb-6">
            <span className="text-4xl">🚛</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white font-['Manrope',sans-serif] tracking-tight">
            TTransport
          </h1>
          <p className="text-[hsl(220,20%,70%)] mt-2 text-sm">Hệ thống quản lý vận tải hàng hóa</p>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-8">
          <h2 className="text-lg font-bold text-[#0a1f33] text-center mb-2">Chọn vai trò</h2>
          <p className="text-sm text-[hsl(220,10%,55%)] text-center mb-6">Đăng nhập nhanh để tiếp tục</p>

          <div className="grid grid-cols-2 gap-3">
            {roles.map(({ key, desc }) => (
              <button
                key={key}
                onClick={() => handleSelect(key)}
                className="group flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-[hsl(220,10%,92%)] hover:border-[#0a2540] hover:shadow-[0_10px_15px_-3px_rgba(10,37,64,0.15)] transition-all duration-200 active:scale-95"
              >
                <span className="text-3xl group-hover:scale-110 transition-transform">{ROLE_ICONS[key]}</span>
                <span className="text-sm font-bold text-[#0a1f33]">{ROLE_LABELS[key]}</span>
                <span className="text-[10px] text-[hsl(220,10%,55%)] text-center leading-tight">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-[hsl(220,20%,50%)] text-xs mt-6">
          Phiên bản demo • TTransport v1.0
        </p>
      </div>
    </div>
  )
}
