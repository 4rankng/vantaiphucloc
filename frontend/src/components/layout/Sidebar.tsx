import { useNavigate, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'

interface NavItem {
  label: string
  icon: React.ReactNode
  path: string
}

interface SidebarProps {
  items: NavItem[]
  title?: string
}

export function Sidebar({ items, title = 'TTransport' }: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-[hsl(220,90%,12%)] text-[hsl(220,10%,95%)]">
      <div className="p-6 border-b border-[hsl(220,30%,18%)]">
        <h1 className="text-xl font-bold tracking-tight font-['Manrope',sans-serif]">
          <span className="text-[#d4a839]">T</span>ransport
        </h1>
        {title && <p className="text-xs text-[hsl(220,10%,65%)] mt-1">{title}</p>}
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {items.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[hsl(220,30%,20%)] text-white border-r-2 border-[#d4a839]'
                  : 'text-[hsl(220,10%,65%)] hover:bg-[hsl(220,30%,18%)] hover:text-white'
              )}
            >
              {item.icon}
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="p-4 border-t border-[hsl(220,30%,18%)]">
        <button
          onClick={() => { logout(); navigate('/') }}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[hsl(220,10%,65%)] hover:text-white hover:bg-[hsl(220,30%,18%)] rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Đăng xuất
        </button>
      </div>
    </aside>
  )
}
