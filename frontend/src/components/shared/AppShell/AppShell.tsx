import type { ReactNode } from 'react'
import { AppTopBar, type AppTopBarProps } from '@/components/shared/AppTopBar'

interface AppShellProps {
  topbarProps: AppTopBarProps
  contentClassName?: string
  children: ReactNode
}

/**
 * AppShell — mobile-only layout wrapper.
 * Full-width topbar + scrollable content area.
 * No max-width constraint: content fills the screen edge-to-edge on mobile.
 */
export function AppShell({ topbarProps, contentClassName, children }: AppShellProps) {
  return (
    <div className="min-h-[100dvh] w-full" style={{ background: 'var(--theme-bg-primary)' }}>
      {/* Topbar: full-bleed, no centering constraint on mobile */}
      <header className="w-full" style={{ background: 'var(--theme-brand-primary)' }}>
        <AppTopBar {...topbarProps} />
      </header>
      {/* Content: full width, padding handled here */}
      <main className={contentClassName}>
        {children}
      </main>
    </div>
  )
}
