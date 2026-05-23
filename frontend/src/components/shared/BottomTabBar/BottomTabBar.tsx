import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useUnreadCount } from '@/components/shared/NotificationPanel/useUnreadCount'
import type { LucideIcon } from 'lucide-react'

export interface TabItem {
  path: string
  label: string
  icon: LucideIcon
  exact?: boolean
  badge?: 'notifications'
}

interface BottomTabBarProps {
  tabs: TabItem[]
}

export function BottomTabBar({ tabs }: BottomTabBarProps) {
  const location = useLocation()
  const unread = useUnreadCount()

  // When there are many tabs, hide labels on inactive items to save space
  const manyTabs = tabs.length > 5

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 flex items-stretch lg:hidden"
      style={{
        background: 'var(--theme-bg-secondary)',
        borderTop: '1px solid var(--theme-border-default)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {tabs.map(({ path, label, icon: Icon, exact, badge }) => {
        const isActive = exact
          ? location.pathname === path
          : location.pathname === path || location.pathname.startsWith(path + '/')
        const badgeCount = badge === 'notifications' ? unread : 0
        const showLabel = !manyTabs || isActive

        return (
          <NavLink
            key={path}
            to={path}
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center gap-0.5 touch-manipulation select-none transition-colors',
              showLabel ? 'py-2 min-h-[56px]' : 'py-3 min-h-[56px]',
            )}
            style={{ color: isActive ? 'var(--theme-brand-primary)' : 'var(--theme-text-muted)' }}
          >
            <div className="relative">
              <Icon
                className={cn('transition-transform', isActive ? 'w-[20px] h-[20px] scale-110' : 'w-[20px] h-[20px]')}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              {badgeCount > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[9px] font-bold leading-none px-1 text-white"
                  style={{ background: 'var(--theme-status-error)' }}
                >
                  {badgeCount > 99 ? '99+' : badgeCount}
                </span>
              )}
            </div>
            {showLabel && (
              <span className={cn('text-[10px] leading-none text-center whitespace-nowrap', isActive ? 'font-semibold' : 'font-normal')}>
                {label}
              </span>
            )}
            {isActive && (
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-b-full"
                style={{ background: 'linear-gradient(90deg, transparent, var(--theme-brand-primary), transparent)' }}
              />
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}
