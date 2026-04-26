import { UserCircle } from 'lucide-react'
import { useEffect } from 'react'
import { useDriverStore } from '@/hooks/use-driver-store'
import { BackButton } from '@/components/shared/BackButton'

/* ─── Scroll to top on route change ───────────────────────── */
function ScrollToTop() {
  const { currentPath } = useDriverStore()
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [currentPath])
  return null
}

/* ─── Top bar ──────────────────────────────────────────────── */
export function TopBar() {
  const { driver, navigate } = useDriverStore()

  return (
    <div
      className="px-4 pt-3 pb-2"
      style={{ background: 'var(--theme-brand-primary)' }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px]" style={{ color: 'var(--theme-text-on-brand)', opacity: 0.75 }}>Xin chào,</p>
          <p className="text-[15px] font-bold" style={{ color: 'var(--theme-text-on-brand)' }}>{driver.name}</p>
        </div>
        <button
          className="w-9 h-9 flex items-center justify-center rounded-full touch-manipulation"
          style={{ background: 'rgba(255,255,255,0.35)', color: 'var(--theme-text-on-brand)' }}
          onClick={() => navigate('/driver/profile')} aria-label="Tài khoản"
        >
          <UserCircle className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

/* ─── Page layout — with back button ──────────────────────── */
export function PageLayout({ children, showBack = false, className }: {
  children: React.ReactNode
  showBack?: boolean
  className?: string
}) {
  const { goBack } = useDriverStore()
  return (
    <div className="min-h-[100dvh]" style={{ background: 'var(--theme-bg-primary)' }}>
      <ScrollToTop />
      <TopBar />
      <main className={cn('p-4 space-y-4', className)}>
        {showBack && <BackButton onClick={goBack} />}
        {children}
      </main>
    </div>
  )
}

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

/* ─── Home layout ─────────────────────────────────────────── */
export function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh]" style={{ background: 'var(--theme-bg-primary)' }}>
      <ScrollToTop />
      <main>
        {children}
      </main>
    </div>
  )
}
