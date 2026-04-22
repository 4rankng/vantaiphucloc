import { useDriverStore } from '@/hooks/use-driver-store'
import { useAuth } from '@/contexts/AuthContext'
import { BackButton } from '@/components/shared/BackButton'
import { Badge } from '@/components/ui/Badge'
import { Phone, TruckIcon, DollarSign, Route, Star, CalendarDays, LogOut } from 'lucide-react'

export function Profile() {
  const { driver } = useDriverStore()
  const { logout } = useAuth()
  const initials = driver.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="p-4 space-y-4">
      <BackButton />

      {/* Compact header: avatar + name + badge inline */}
      <div className="flex items-center gap-3 rounded-2xl p-3" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
          style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold truncate" style={{ color: 'var(--theme-text-primary)' }}>{driver.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Phone className="w-3 h-3" style={{ color: 'var(--theme-text-muted)' }} />
            <span className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>{driver.phone}</span>
          </div>
        </div>
        <Badge variant="success" className="text-[10px] shrink-0">Tài xế</Badge>
      </div>

      {/* Stats row — compact 3-col */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl p-2.5 text-center" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
          <Route className="w-4 h-4 mx-auto mb-1" style={{ color: 'var(--theme-brand-primary)' }} />
          <p className="text-xs font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{driver.totalTrips}</p>
          <p className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>Tổng chuyến</p>
        </div>
        <div className="rounded-2xl p-2.5 text-center" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
          <CalendarDays className="w-4 h-4 mx-auto mb-1" style={{ color: 'var(--theme-status-warning)' }} />
          <p className="text-xs font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{driver.monthlyTrips}</p>
          <p className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>Tháng này</p>
        </div>
        <div className="rounded-2xl p-2.5 text-center" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
          <Star className="w-4 h-4 mx-auto mb-1" style={{ color: 'var(--theme-status-warning)' }} />
          <p className="text-xs font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{driver.rating}</p>
          <p className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>Đánh giá</p>
        </div>
      </div>

      {/* Info rows — no icons, compact label-value pairs */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
        {[
          { label: 'Mã tài xế', value: driver.id },
          { label: 'Đầu kéo', value: driver.tractorPlate },
          { label: 'Phí/chuyến', value: driver.fixedFeePerTrip.toLocaleString('vi-VN') + ' ₫' },
          { label: 'Doanh thu tháng', value: driver.monthlyRevenue.toLocaleString('vi-VN') + ' ₫' },
        ].map(({ label, value }, i, arr) => (
          <div key={label}>
            <div className="flex justify-between items-center px-4 py-2.5">
              <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{label}</span>
              <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{value}</span>
            </div>
            {i < arr.length - 1 && <div className="mx-4 border-t" style={{ borderColor: 'var(--theme-border-light)' }} />}
          </div>
        ))}
      </div>

      {/* Logout */}
      <button
        onClick={() => logout()}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm"
        style={{ background: 'var(--theme-status-error-light)', color: 'var(--theme-status-error-text)' }}
      >
        <LogOut className="w-4 h-4" />
        Đăng xuất
      </button>
    </div>
  )
}
