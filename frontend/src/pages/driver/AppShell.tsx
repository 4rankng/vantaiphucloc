import { useEffect, useState } from 'react'
import { useDriverStore } from '@/hooks/use-driver-store'
import { AppTopBar } from '@/components/shared/AppTopBar'
import { UserDropdown } from '@/components/shared/ProfileDialog'

function ScrollToTop() {
  const { currentPath } = useDriverStore()
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [currentPath])
  return null
}

export function TopBar() {
  const { driver, navigate } = useDriverStore()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  return (
    <>
      <AppTopBar
        variant="home"
        name={driver.name}
        onNotifications={() => navigate('/driver/notifications')}
        onProfile={() => setDropdownOpen(true)}
      />
      <UserDropdown open={dropdownOpen} onClose={() => setDropdownOpen(false)} />
    </>
  )
}

export function PageLayout({ children, showBack = false, title = '', className }: {
  children: React.ReactNode
  showBack?: boolean
  title?: string
  className?: string
}) {
  const { goBack } = useDriverStore()
  return (
    <div className="min-h-[100dvh]" style={{ background: 'var(--theme-bg-primary)' }}>
      <ScrollToTop />
      {showBack
        ? <AppTopBar variant="page" title={title} onBack={goBack} />
        : <TopBar />
      }
      <main className={cn('p-4 space-y-4', className)}>
        {children}
      </main>
    </div>
  )
}

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

export function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh]" style={{ background: 'var(--theme-bg-primary)' }}>
      <ScrollToTop />
      <TopBar />
      <main>{children}</main>
    </div>
  )
}
