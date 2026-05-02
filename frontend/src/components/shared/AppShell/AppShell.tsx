import type { ReactNode } from 'react'
import { AppTopBar, type AppTopBarProps } from '@/components/shared/AppTopBar'

interface AppShellProps {
  topbarProps: AppTopBarProps
  contentClassName?: string
  children: ReactNode
}

/**
 * AppShell — mobile-first layout wrapper with glass topbar.
 * Body gradient: brand color bleeds from top 140px, then fades to page bg.
 * Topbar: static with backdrop blur (glass effect).
 */
export function AppShell({ topbarProps, contentClassName, children }: AppShellProps) {
  return (
    <div className="min-h-[100dvh] w-full" style={{ background: 'var(--body-gradient)' }}>
      <header
        className="z-20 w-full"
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
          borderBottom: '1px solid var(--surface-border)',
        }}
      >
        <AppTopBar {...topbarProps} />
      </header>
      <main className={contentClassName}>
        {children}
      </main>
    </div>
  )
}
