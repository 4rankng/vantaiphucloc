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
    <div className="min-h-screen" style={{ background: 'var(--theme-bg-primary)' }}>
      <DesktopSidebar navItems={navItems} label={roleLabel} />
      <main className="lg:pl-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
