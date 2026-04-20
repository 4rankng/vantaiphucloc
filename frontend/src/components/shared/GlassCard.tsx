import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface GlassCardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export function GlassCard({ children, className, onClick }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-xl shadow-[0_4px_6px_-1px_rgba(10,37,64,0.12),0_2px_4px_-2px_rgba(10,37,64,0.12)] border border-[hsl(220,10%,92%)] transition-shadow hover:shadow-[0_10px_15px_-3px_rgba(10,37,64,0.15),0_4px_6px_-4px_rgba(10,37,64,0.15)]',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  )
}
