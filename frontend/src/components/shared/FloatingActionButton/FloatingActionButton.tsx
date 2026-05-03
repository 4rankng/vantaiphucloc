import type { ReactNode, CSSProperties } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const fabVariants = cva(
  'fixed z-40 flex h-14 w-14 items-center justify-center rounded-full transition-all duration-200 active:scale-90 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-brand-primary)] focus-visible:ring-offset-2 touch-manipulation',
  {
    variants: {
      position: {
        'bottom-right': 'right-5',
        'bottom-left': 'left-5',
        'bottom-center': 'left-1/2 -translate-x-1/2',
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

/**
 * Modern SaaS FAB — circular, brand emerald, sits above the bottom tab bar
 * on mobile and above the page bottom on desktop. Visible on ALL viewports.
 *
 * Uses inline `bottom` style because Tailwind doesn't compile dynamic
 * `calc(env(...))` values reliably from class names.
 */
export function FloatingActionButton({ icon, onClick, position, className, label }: FloatingActionButtonProps) {
  // Sits low — 20px above viewport bottom (plus safe-area for notched phones).
  // Driver shell has no bottom tab bar, so no extra offset needed.
  // For roles with a bottom tab bar (director / admin mobile), the page content
  // adds bottom padding so the last items clear both the tab bar and the FAB.
  const style: CSSProperties = {
    bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
    background: 'var(--theme-brand-primary)',
    color: 'var(--theme-text-on-brand)',
    boxShadow: '0 8px 20px -6px rgba(5, 150, 105, 0.55), 0 2px 6px rgba(9, 9, 11, 0.10)',
  }

  return (
    <button
      onClick={onClick}
      className={cn(fabVariants({ position }), className)}
      style={style}
      aria-label={label}
    >
      {icon}
    </button>
  )
}
