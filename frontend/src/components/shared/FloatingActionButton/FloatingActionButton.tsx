import type { ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const fabVariants = cva(
  'fixed z-40 flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-200 active:scale-90 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-brand-secondary)] focus-visible:ring-offset-2 lg:hidden',
  {
    variants: {
      position: {
        'bottom-right': 'bottom-6 right-6',
        'bottom-left': 'bottom-6 left-6',
        'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
      },
    },
    defaultVariants: { position: 'bottom-right' },
  }
)

interface FloatingActionButtonProps extends VariantProps<typeof fabVariants> {
  icon: ReactNode
  onClick?: () => void
  className?: string
  label?: string
}

export function FloatingActionButton({ icon, onClick, position, className, label }: FloatingActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(fabVariants({ position }), className)}
      style={{
        background: 'var(--theme-brand-primary)',
        color: 'var(--theme-text-on-brand)',
        boxShadow: '0 4px 14px rgba(0, 150, 62, 0.4)',
      }}
      aria-label={label}
    >
      {icon}
    </button>
  )
}
