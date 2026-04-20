import { useNavigate, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface NavItem {
  label: string
  icon: ReactNode
  path: string
}

interface MobileBottomNavProps {
  items: NavItem[]
}

export function MobileBottomNav({ items }: MobileBottomNavProps) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[hsl(220,10%,88%)] z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {items.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 py-1 px-3 min-w-0 flex-1',
                isActive ? 'text-[#0a2540]' : 'text-[hsl(220,10%,55%)]'
              )}
            >
              {item.icon}
              <span className="text-[10px] font-medium truncate">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
