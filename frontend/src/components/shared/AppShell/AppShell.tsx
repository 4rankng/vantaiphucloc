import type { ReactNode } from 'react'
import { AppTopBar, type AppTopBarProps } from '@/components/shared/AppTopBar'
import { PageTransition } from '@/components/shared/PageTransition'

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
        {/* Brand glow strip at header bottom */}
        <div
          aria-hidden="true"
          style={{
            height: '2px',
            background: isDark
              ? 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 30%, rgba(255,255,255,0.12) 70%, transparent 100%)'
              : 'linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--theme-brand-primary) 30%, transparent) 30%, color-mix(in srgb, var(--theme-brand-primary) 30%, transparent) 70%, transparent 100%)',
          }}
        />
      </header>
      <main className={`flex-1 bg-dot-grid ${contentClassName ?? ''}`}>
        <PageTransition>
          {children}
        </PageTransition>
      </main>
    </div>
  )
}
