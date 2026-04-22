import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PillProps {
  children: ReactNode
  active?: boolean
  onClick?: () => void
  className?: string
  icon?: ReactNode
}

export function Pill({ children, active, onClick, className, icon }: PillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3.5 py-2.5 rounded-full text-sm font-medium transition-all',
        className,
      )}
      style={{
        background: active ? 'var(--theme-brand-primary)' : 'var(--theme-bg-secondary)',
        color: active ? 'var(--theme-text-on-brand)' : 'var(--theme-text-secondary)',
        boxShadow: active ? 'var(--theme-shadow-sm)' : 'none',
      }}
    >
      {icon}
      {children}
    </button>
  )
}
