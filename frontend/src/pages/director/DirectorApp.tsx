import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { AppStoreProvider, useAppStore } from '@/hooks/use-app-store'
import { BackButton } from '@/components/shared/BackButton'
import { Bell, LogOut, UserCircle } from 'lucide-react'
import { directorNav, directorMobileNav, getPageTitle } from '@/lib/navigation'
import { cn } from '@/lib/utils'
import { DirectorDashboard } from './DirectorDashboard'
import type { LucideIcon } from 'lucide-react'

function TopBar() {
  const { user, logout } = useAuth()
  const { currentPath } = useAppStore()
  const title = getPageTitle(currentPath)

  return (
    <div className="px-4 pt-3 pb-2" style={{ background: 'var(--theme-brand-primary)' }}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[11px] truncate" style={{ color: 'var(--theme-text-on-brand)', opacity: 0.75 }}>{title}</p>
          <p className="text-[15px] font-bold truncate" style={{ color: 'var(--theme-text-on-brand)' }}>{user?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="w-9 h-9 flex items-center justify-center rounded-full touch-manipulation"
            style={{ background: 'rgba(255,255,255,0.35)', color: 'var(--theme-text-on-brand)' }}
            onClick={logout} aria-label="Đăng xuất"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function MobileNav() {
  const { currentPath, navigate } = useAppStore()

  return (
    <div className="shell-bottomnav border-t fixed bottom-0 left-0 right-0 z-50"
      style={{ background: 'var(--theme-bottom-nav)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderColor: 'var(--theme-bottom-nav-border)' }}>
      <div className="flex items-stretch h-14 relative px-2">
        {directorMobileNav.map(({ path, icon: Icon, label }) => {
          const isActive = currentPath === path || (path !== '/director' && currentPath.startsWith(path))
          return (
            <button key={path} onClick={() => navigate(path)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 touch-manipulation relative group transition-all duration-300"
              aria-label={label}>
              {isActive && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1.5 rounded-b-full" style={{ background: 'var(--theme-bottom-nav-active)', opacity: 0.9 }} />}
              <div className={cn('p-1.5 rounded-full transition-all duration-300', isActive && '-translate-y-1')}
                style={{ background: isActive ? 'var(--theme-brand-primary-light)' : 'transparent' }}>
                <Icon className={cn('h-5 w-5 transition-all duration-300', isActive && 'stroke-[2.5px]')}
                  style={{ color: isActive ? 'var(--theme-bottom-nav-active)' : 'var(--theme-bottom-nav-inactive)' }} />
              </div>
              <span className={cn('text-[10px] font-medium leading-none transition-all duration-300', !isActive && 'opacity-80')}
                style={{ color: isActive ? 'var(--theme-bottom-nav-active)' : 'var(--theme-bottom-nav-inactive)' }}>{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Router() {
  const { currentPath, goBack } = useAppStore()

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [currentPath])

  if (currentPath === '/director') {
    return <DirectorDashboard />
  }

  return (
    <div className="p-4 space-y-4">
      <BackButton onClick={goBack} />
      <div className="text-center py-12" style={{ color: 'var(--theme-text-muted)' }}>
        <p className="text-sm">Trang đang phát triển</p>
      </div>
    </div>
  )
}

export function DirectorApp() {
  return (
    <AppStoreProvider initialPath="/director">
      <div className="min-h-[100dvh] pb-14" style={{ background: 'var(--theme-bg-primary)' }}>
        <TopBar />
        <Router />
        <MobileNav />
      </div>
    </AppStoreProvider>
  )
}
