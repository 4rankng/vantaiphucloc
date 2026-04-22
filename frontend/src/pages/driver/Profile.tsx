import { useDriverStore } from '@/hooks/use-driver-store'
import { useAuth } from '@/contexts/AuthContext'
import { Badge } from '@/components/ui/Badge'
import { ArrowLeft, User, Phone, TruckIcon, DollarSign, Route, Star, CalendarDays, LogOut } from 'lucide-react'

export function Profile() {
  const { driver, navigate } = useDriverStore()
  const { logout } = useAuth()
  const initials = driver.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="p-4 space-y-5">
      <button
        onClick={() => navigate('/driver')}
        className="flex items-center gap-1.5 text-sm font-semibold"
        style={{ color: 'var(--theme-brand-primary)' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Quay lại
      </button>

      {/* Avatar section */}
      <div className="flex flex-col items-center py-6">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-xl font-bold"
          style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
        >
          {initials}
        </div>
        <h2 className="text-lg font-bold mt-4" style={{ color: 'var(--theme-text-primary)' }}>{driver.name}</h2>
        <div className="flex items-center gap-1.5 mt-1.5">
          <Phone className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-muted)' }} />
          <span className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>{driver.phone}</span>
        </div>
        <Badge variant="success" className="mt-3">Tài xế</Badge>
      </div>

      {/* Info card */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
        {[
          { icon: User, label: 'Mã tài xế', value: driver.id },
          { icon: Phone, label: 'Số điện thoại', value: driver.phone },
          { icon: TruckIcon, label: 'Đầu kéo', value: driver.tractorPlate },
          { icon: DollarSign, label: 'Phí/chuyến', value: driver.fixedFeePerTrip.toLocaleString('vi-VN') + ' ₫' },
          { icon: Route, label: 'Tổng chuyến', value: driver.totalTrips + ' chuyến' },
          { icon: CalendarDays, label: 'Chuyến tháng này', value: driver.monthlyTrips + ' chuyến' },
          { icon: DollarSign, label: 'Doanh thu tháng', value: driver.monthlyRevenue.toLocaleString('vi-VN') + ' ₫' },
          { icon: Star, label: 'Đánh giá', value: driver.rating + '/5.0' },
        ].map(({ icon: Icon, label, value }, i, arr) => (
          <div key={label}>
            <div className="flex justify-between items-center px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--theme-bg-tertiary)' }}>
                  <Icon className="w-4 h-4" style={{ color: 'var(--theme-text-secondary)' }} />
                </div>
                <span className="text-xs font-medium" style={{ color: 'var(--theme-text-secondary)' }}>{label}</span>
              </div>
              <span className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{value}</span>
            </div>
            {i < arr.length - 1 && <div className="mx-4 border-t" style={{ borderColor: 'var(--theme-border-light)' }} />}
          </div>
        ))}
      </div>

      {/* Logout */}
      <button
        onClick={() => logout()}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm mt-2"
        style={{ background: 'var(--theme-status-error-light)', color: 'var(--theme-status-error-text)' }}
      >
        <LogOut className="w-4 h-4" />
        Đăng xuất
      </button>
    </div>
  )
}
