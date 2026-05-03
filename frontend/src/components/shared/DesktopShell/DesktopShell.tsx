import type { ReactNode } from 'react'
import type { NavItem } from './navConfig'
import { DesktopSidebar } from './DesktopSidebar'

export function DesktopShell({
  navItems,
  roleLabel,
  children,
}: {
  navItems: NavItem[]
  roleLabel: string
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-dot-grid" style={{ background: 'var(--theme-bg-primary)' }}>
      <DesktopSidebar navItems={navItems} label={roleLabel} />
      <main className="lg:pl-64 bg-dot-grid min-h-screen">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
