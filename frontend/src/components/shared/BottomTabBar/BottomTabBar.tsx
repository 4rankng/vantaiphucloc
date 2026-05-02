import { NavLink, useLocation } from 'react-router-dom'
import { Home, PlusCircle, Clock, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TabItem {
  label: string
  icon: React.ComponentType<{ className?: string }>
  path: string
  exact?: boolean
}

interface BottomTabBarProps {
  items: TabItem[]
}

export function BottomTabBar({ items }: BottomTabBarProps) {
  const location = useLocation()

  return (
    <nav className="shell-bottomnav glass-overlay border-t" style={{ borderColor: 'var(--theme-border-default)' }}>
      <div className="flex items-center justify-around h-[--shell-bottomnav-h]">
        {items.map(item => {
          const isActive = item.exact
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path)
          const Icon = item.icon

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors touch-target',
              )}
              style={{ color: isActive ? 'var(--theme-brand-primary)' : 'var(--theme-text-muted)' }}
            >
              <Icon className="w-5 h-5" />
              <span className="text-2xs font-medium">{item.label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

export const DRIVER_TABS: TabItem[] = [
  { label: 'Trang chủ', icon: Home, path: '/driver', exact: true },
  { label: 'Tạo chuyến', icon: PlusCircle, path: '/driver/work-orders/new' },
  { label: 'Lịch sử', icon: Clock, path: '/driver/history' },
  { label: 'Hồ sơ', icon: User, path: '/driver/profile' },
]
