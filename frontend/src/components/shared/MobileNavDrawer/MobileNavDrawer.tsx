import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Menu, LogOut } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/Sheet'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

export interface MobileNavItem {
  label: string
  icon: LucideIcon
  path: string
  exact?: boolean
}

interface MobileNavDrawerProps {
  items: MobileNavItem[]
  roleLabel: string
}

export function MobileNavDrawer({ items, roleLabel }: MobileNavDrawerProps) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleNavigate = (path: string) => {
    navigate(path)
    setOpen(false)
  }

  const handleLogout = () => {
    logout()
    setOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-8 h-8 flex items-center justify-center rounded-full touch-manipulation"
        style={{ background: 'rgba(255,255,255,0.2)', color: 'var(--theme-text-on-brand)' }}
        aria-label="Menu"
      >
        <Menu className="w-4 h-4" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="px-4 py-3 border-b" style={{ borderColor: 'var(--theme-border-default)' }}>
            <div className="flex items-center gap-2.5">
              <img src="/logo.avif" alt="Logo" className="h-7 w-7 object-contain rounded-md" />
              <div>
                <SheetTitle className="text-sm font-bold">TTransport</SheetTitle>
                <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{roleLabel}</p>
              </div>
            </div>
          </SheetHeader>

          <nav className="py-2">
            {items.map(item => {
              const isActive = item.exact
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path)
              const Icon = item.icon

              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigate(item.path)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'text-[var(--theme-brand-primary)] bg-[var(--theme-brand-primary-light)]'
                      : 'text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)]',
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              )
            })}
          </nav>

          <div className="mt-auto border-t" style={{ borderColor: 'var(--theme-border-default)' }}>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-red-50"
              style={{ color: 'var(--theme-status-error)' }}
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
