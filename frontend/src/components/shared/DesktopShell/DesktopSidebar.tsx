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
          TTransport
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
      {/* Road art decoration */}
      <div className="px-3 pt-2 pb-1 shrink-0 pointer-events-none select-none" style={{ opacity: 0.35 }}>
        <svg viewBox="0 0 200 56" fill="none" aria-hidden="true" style={{ width: '100%', display: 'block' }}>
          <circle cx="20"  cy="8"  r="0.9" fill="#059669" fillOpacity="0.6"/>
          <circle cx="80"  cy="5"  r="0.7" fill="#059669" fillOpacity="0.5"/>
          <circle cx="140" cy="9"  r="1"   fill="#059669" fillOpacity="0.55"/>
          <circle cx="185" cy="6"  r="0.8" fill="#059669" fillOpacity="0.4"/>
          <path d="M0 26 Q50 18 100 23 Q150 28 200 20 L200 30 L0 30 Z" fill="#059669" fillOpacity="0.06"/>
          <rect x="0" y="30" width="200" height="26" fill="#059669" fillOpacity="0.04" rx="2"/>
          <g stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.18">
            <line x1="0"   y1="43" x2="20"  y2="43"/>
            <line x1="32"  y1="43" x2="52"  y2="43"/>
            <line x1="64"  y1="43" x2="84"  y2="43"/>
            <line x1="96"  y1="43" x2="116" y2="43"/>
            <line x1="128" y1="43" x2="148" y2="43"/>
            <line x1="160" y1="43" x2="180" y2="43"/>
          </g>
          <g transform="translate(20 30)">
            <rect x="0" y="2" width="56" height="22" rx="2" fill="#059669" fillOpacity="0.1"/>
            <path d="M56 5 L72 5 Q75 5 75 8 L75 24 L56 24 Z" fill="#059669" fillOpacity="0.14"/>
            <circle cx="12"  cy="26" r="4.5" fill="#059669" fillOpacity="0.14"/>
            <circle cx="61"  cy="26" r="4.5" fill="#059669" fillOpacity="0.14"/>
          </g>
          <g transform="translate(118 34)" opacity="0.6">
            <rect x="0" y="1" width="36" height="14" rx="2" fill="#059669" fillOpacity="0.1"/>
            <path d="M36 3 L48 3 Q51 3 51 6 L51 15 L36 15 Z" fill="#059669" fillOpacity="0.12"/>
            <circle cx="8"  cy="17" r="3" fill="#059669" fillOpacity="0.12"/>
            <circle cx="42" cy="17" r="3" fill="#059669" fillOpacity="0.12"/>
          </g>
        </svg>
      </div>
      <div className="px-3 py-3 shrink-0" style={{ borderTop: '1px solid var(--theme-border-default)' }}>
        <p className="text-xs text-center" style={{ color: 'var(--theme-text-muted)' }}>
          Vận tải TTransport
        </p>
      </div>
    </aside>
  )
}
