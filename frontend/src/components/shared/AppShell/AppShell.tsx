import type { ReactNode } from 'react'
import { AppTopBar, type AppTopBarProps } from '@/components/shared/AppTopBar'

interface AppShellProps {
  topbarProps: AppTopBarProps
  contentClassName?: string
  children: ReactNode
  /**
   * "light" (default): glass topbar over the green body gradient.
   * "dark": solid dark-green topbar — used by accountant mobile shell.
   */
  topbarTheme?: 'light' | 'dark'
}

export function AppShell({ topbarProps, contentClassName, children, topbarTheme = 'light' }: AppShellProps) {
  const isDark = topbarTheme === 'dark'

  return (
    <div
      className="min-h-[100dvh] w-full flex flex-col"
      style={{ background: isDark ? 'var(--theme-bg-primary)' : 'var(--body-gradient)' }}
    >
      <header
        className="z-20 w-full shrink-0"
        style={
          isDark
            ? { background: 'var(--theme-sidebar, #0a3520)' }
            : {
                background: 'var(--glass-bg)',
                backdropFilter: 'var(--glass-blur)',
                WebkitBackdropFilter: 'var(--glass-blur)',
                borderBottom: '1px solid var(--surface-border)',
              }
        }
      >
        <AppTopBar {...topbarProps} theme={topbarTheme} />
      </header>
      <main className={`flex-1 ${contentClassName ?? ''}`}>
        {children}
      </main>
    </div>
  )
}
