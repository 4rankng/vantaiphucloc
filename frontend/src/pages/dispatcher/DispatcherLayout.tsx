import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { MobileHeader, DesktopHeader } from '@/components/layout/Header'
import { dispatcherNav, dispatcherMobileNav, getPageTitle } from '@/lib/navigation'

export default function DispatcherLayout() {
  const location = useLocation()
  const title = getPageTitle(location.pathname)

  return (
    <div className="flex min-h-screen bg-[var(--theme-bg-primary)]">
      <Sidebar items={dispatcherNav} title="Điều hành" basePath="/dispatcher" />
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <DesktopHeader title={title} />
        <MobileHeader title={title} />
        <main className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto p-4 lg:p-6 pb-24 lg:pb-6">
            <Outlet />
          </div>
        </main>
        <MobileBottomNav items={dispatcherMobileNav} />
      </div>
    </div>
  )
}
