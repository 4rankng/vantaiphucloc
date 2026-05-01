import type { ReactNode } from 'react'
import { AppTopBar, type AppTopBarProps } from '@/components/shared/AppTopBar'

interface AppShellProps {
  topbarProps: AppTopBarProps
  contentClassName?: string
  children: ReactNode
}

export function AppShell({ topbarProps, contentClassName, children }: AppShellProps) {
  return (
    <div className="min-h-[100dvh]" style={{ background: 'var(--theme-bg-primary)' }}>
      {/* Topbar: full-bleed wrapper */}
      <header style={{ background: 'var(--theme-brand-primary)' }}>
        <div className="w-full max-w-7xl mx-auto">
          <AppTopBar {...topbarProps} />
        </div>
      </header>
      {/* Content: full-bleed wrapper */}
      <div className="w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <main className={contentClassName}>
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
