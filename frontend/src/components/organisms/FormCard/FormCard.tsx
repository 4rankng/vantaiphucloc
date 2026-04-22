import type { ReactNode } from 'react'

interface FormCardProps {
  children: ReactNode
  className?: string
}

export function FormCard({ children, className }: FormCardProps) {
  return (
    <div className={`rounded-2xl p-4 ${className ?? ''}`} style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
      {children}
    </div>
  )
}
