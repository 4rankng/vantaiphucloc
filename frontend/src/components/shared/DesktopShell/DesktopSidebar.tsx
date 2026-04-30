import { Link, useLocation } from 'react-router-dom'
import type { NavItem } from './navConfig'

export function DesktopSidebar({
  navItems,
  label,
}: {
  navItems: NavItem[]
  label: string
}) {
  const location = useLocation()

  return (
    <aside
      className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:z-40"
      style={{
        background: 'var(--theme-bg-secondary)',
        borderRight: '1px solid var(--theme-border-default)',
      }}
    >
      {/* Brand */}
      <div className="h-16 flex items-center px-6 shrink-0" style={{ borderBottom: '1px solid var(--theme-border-default)' }}>
        <span className="text-lg font-bold" style={{ color: 'var(--theme-brand-primary)' }}>
          Phúc Lộc
        </span>
        <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}>
          {label}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map(item => {
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname === item.path || location.pathname.startsWith(item.path + '/')
            const Icon = item.icon

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{
                    background: isActive ? 'var(--theme-brand-primary-light)' : 'transparent',
                    color: isActive ? 'var(--theme-brand-primary)' : 'var(--theme-text-secondary)',
                  }}
                >
                  <Icon className="w-4.5 h-4.5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 shrink-0" style={{ borderTop: '1px solid var(--theme-border-default)' }}>
        <p className="text-xs text-center" style={{ color: 'var(--theme-text-muted)' }}>
          Vận tải Phúc Lộc
        </p>
      </div>
    </aside>
  )
}
