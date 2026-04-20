import { Outlet, useLocation } from 'react-router-dom'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { MobileHeader } from '@/components/layout/Header'
import { driverNav, getPageTitle } from '@/lib/navigation'

export default function DriverLayout() {
  const location = useLocation()
  const title = getPageTitle(location.pathname)

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <MobileHeader title={title} />
      <main className="max-w-2xl mx-auto p-4 pb-24">
        <Outlet />
      </main>
      <MobileBottomNav items={driverNav} />
    </div>
  )
}
