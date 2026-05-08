import { useCallback } from 'react'
import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { LogOut, UserCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui'
import { ROLE_LABELS } from '@/data/domain'

export function SuperAdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = useCallback(() => {
    logout()
    navigate('/login')
  }, [logout, navigate])

  if (!user || user.role !== 'superadmin') {
    return <Navigate to="/" replace />
  }

  const initial = (user.name || user.username || '?').charAt(0).toUpperCase()

  return (
    <div className="flex h-[100dvh] flex-col" style={{ background: 'var(--theme-bg-primary)' }}>
      <header
        className="sticky top-0 z-30 flex items-center h-14 px-4 sm:px-6 gap-3 shrink-0"
        style={{
          background: 'var(--theme-bg-secondary)',
          borderBottom: '1px solid var(--theme-border-default)',
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <img src="/logo.avif" alt="" className="h-7 w-7 object-contain rounded-md shrink-0" />
          <div className="flex flex-col leading-tight min-w-0">
            <span
              className="text-[13px] font-semibold tracking-tight truncate"
              style={{ color: 'var(--theme-text-primary)' }}
            >
              Phúc Lộc
            </span>
            <span
              className="text-[10px] font-medium truncate"
              style={{ color: 'var(--theme-text-muted)' }}
            >
              Quản trị hệ thống
            </span>
          </div>
        </div>

        <div className="flex-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 h-9 pl-1.5 pr-2 sm:pr-2.5 rounded-md transition-colors hover:bg-[var(--theme-bg-tertiary)] outline-none"
              aria-label="Tài khoản"
            >
              <div
                className="h-7 w-7 shrink-0 flex items-center justify-center rounded-full text-[11px] font-semibold"
                style={{
                  background: 'var(--theme-brand-primary)',
                  color: 'var(--theme-text-on-brand)',
                }}
              >
                {initial}
              </div>
              <div className="hidden sm:flex flex-col leading-tight text-left max-w-[160px]">
                <span
                  className="text-[12px] font-semibold truncate"
                  style={{ color: 'var(--theme-text-primary)' }}
                >
                  {user.name || user.username}
                </span>
                <span
                  className="text-[10px] truncate"
                  style={{ color: 'var(--theme-text-muted)' }}
                >
                  {ROLE_LABELS.superadmin}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={6} className="w-56 z-[9999]">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="text-[12px] font-semibold truncate">
                {user.name || user.username}
              </span>
              <span
                className="text-[10px] font-normal truncate"
                style={{ color: 'var(--theme-text-muted)' }}
              >
                {user.username ? `@${user.username} · ` : ''}{ROLE_LABELS.superadmin}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/superadmin/profile')}>
              <UserCircle className="mr-2 h-4 w-4" />
              Thông tin cá nhân
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="page-container">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
