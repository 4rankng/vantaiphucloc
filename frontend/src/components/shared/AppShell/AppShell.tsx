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
      <div style={{ background: 'var(--theme-brand-primary)' }}>
        <div className="max-w-[1280px] mx-auto">
          <AppTopBar {...topbarProps} />
        </div>
      </div>
      <div className="max-w-[1280px] mx-auto w-full">
        <main className={contentClassName}>
          {children}
        </main>
      </div>
    </div>
  )
}
