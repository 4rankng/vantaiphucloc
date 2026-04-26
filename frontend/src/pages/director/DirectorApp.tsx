import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { AppStoreProvider, useAppStore } from '@/hooks/use-app-store'
import { BackButton } from '@/components/shared/BackButton'
import { LogOut } from 'lucide-react'
import { getPageTitle } from '@/lib/navigation'
import { DirectorDashboard } from './DirectorDashboard'

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

function DirectorHomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] pb-6" style={{ background: 'var(--theme-bg-primary)' }}>
      <TopBar />
      <main>{children}</main>
    </div>
  )
}

function DirectorPageLayout({ children }: { children: React.ReactNode }) {
  const { goBack } = useAppStore()
  return (
    <div className="min-h-[100dvh] pb-6" style={{ background: 'var(--theme-bg-primary)' }}>
      <TopBar />
      <main className="p-4 space-y-4">
        <BackButton onClick={goBack} />
        {children}
      </main>
    </div>
  )
}

function DirectorRouter() {
  const { currentPath } = useAppStore()

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [currentPath])

  if (currentPath === '/director') {
    return <DirectorHomeLayout><DirectorDashboard /></DirectorHomeLayout>
  }

  return (
    <DirectorPageLayout>
      <div className="text-center py-12" style={{ color: 'var(--theme-text-muted)' }}>
        <p className="text-sm">Trang đang phát triển</p>
      </div>
    </DirectorPageLayout>
  )
}

export function DirectorApp() {
  return (
    <AppStoreProvider initialPath="/director">
      <DirectorRouter />
    </AppStoreProvider>
  )
}
