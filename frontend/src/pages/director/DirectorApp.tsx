import { useAuth } from '@/contexts/AuthContext'
import { LogOut } from 'lucide-react'
import { DirectorDashboard } from './DirectorDashboard'

function TopBar() {
  const { user, logout } = useAuth()

  return (
    <div className="px-4 pt-3 pb-2" style={{ background: 'var(--theme-brand-primary)' }}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[11px] truncate" style={{ color: 'var(--theme-text-on-brand)', opacity: 0.75 }}>Tổng quan</p>
          <p className="text-[15px] font-bold truncate" style={{ color: 'var(--theme-text-on-brand)' }}>{user?.name}</p>
        </div>
        <button
          className="w-9 h-9 flex items-center justify-center rounded-full touch-manipulation"
          style={{ background: 'rgba(255,255,255,0.35)', color: 'var(--theme-text-on-brand)' }}
          onClick={logout} aria-label="Đăng xuất"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

export function DirectorApp() {
  return (
    <div className="min-h-[100dvh] pb-6" style={{ background: 'var(--theme-bg-primary)' }}>
      <TopBar />
      <main>
        <DirectorDashboard />
      </main>
    </div>
  )
}
