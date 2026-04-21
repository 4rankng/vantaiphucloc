import { useNavigate, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

export interface BottomNavItem {
  label: string
  icon: LucideIcon
  path: string
}

interface MobileBottomNavProps {
  items: BottomNavItem[]
}

export function MobileBottomNav({ items }: MobileBottomNavProps) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl border-t safe-area-bottom"
      style={{ background: 'var(--theme-bottom-nav)', borderColor: 'var(--theme-bottom-nav-border)' }}
    >
      <div className="flex items-stretch h-16">
        {items.map((item) => {
          const Icon = item.icon
          const exactMatch = location.pathname === item.path
          const prefixMatch = item.path !== '/' && location.pathname.startsWith(item.path + '/')
          const active = exactMatch || prefixMatch

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 touch-target transition-all duration-200 relative',
                active ? 'text-[var(--theme-bottom-nav-active)]' : 'text-[var(--theme-bottom-nav-inactive)]'
              )}
            >
              {active && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[3px] rounded-b-full"
                  style={{ background: 'var(--theme-brand-secondary)' }}
                />
              )}
              <div className={cn(
                'p-1.5 rounded-full transition-all duration-200',
                active && '-translate-y-0.5'
              )}>
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              </div>
              <span className={cn(
                'text-[10px] font-medium leading-none',
                active ? 'font-semibold' : 'font-normal'
              )}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
