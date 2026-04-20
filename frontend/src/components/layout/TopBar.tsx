import type { ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_LABELS } from '@/types'
import { useNavigate } from 'react-router-dom'

interface TopBarProps {
  title: string
  children?: ReactNode
}

export function TopBar({ title, children }: TopBarProps) {
  const { role, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[hsl(220,10%,92%)]">
      <div className="flex items-center justify-between px-4 lg:px-6 h-14">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-[#0a1f33] font-['Manrope',sans-serif]">{title}</h2>
        </div>
        <div className="flex items-center gap-3">
          {children}
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0a2540] to-[#0a3d6b] flex items-center justify-center text-white text-xs font-bold">
              {role ? ROLE_LABELS[role][0] : 'U'}
            </div>
            <span className="text-sm font-medium text-[#0a1f33]">{role ? ROLE_LABELS[role] : ''}</span>
          </div>
          <button
            onClick={() => { logout(); navigate('/') }}
            className="lg:hidden p-2 text-[hsl(220,10%,55%)] hover:text-[#0a2540]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>
      </div>
    </header>
  )
}
