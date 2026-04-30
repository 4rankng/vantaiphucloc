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
      {/* Topbar: full-width brand bar, content centered on desktop */}
      <div style={{ background: 'var(--theme-brand-primary)' }}>
        <div className="w-full lg:max-w-[1600px] lg:mx-auto lg:px-6">
          <AppTopBar {...topbarProps} />
        </div>
      </div>
      {/* Content: full-width on mobile, constrained on desktop */}
      <div className="w-full lg:max-w-[1600px] lg:mx-auto lg:px-6">
        <main className={contentClassName}>
          {children}
        </main>
      </div>
    </div>
  )
}
