import { useEffect, useRef, type ReactNode, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const fabVariants = cva(
  'fixed z-[9999] flex h-14 w-14 items-center justify-center rounded-full transition-all duration-200 active:scale-90 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-brand-primary)] focus-visible:ring-offset-2 touch-manipulation',
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
 * FAB rendered via React Portal directly onto document.body.
 *
 * This bypasses any ancestor CSS transform / filter / will-change that would
 * otherwise create a new containing block for `position: fixed`, trapping the
 * button inside a scrolling container rather than the viewport.
 */
export function FloatingActionButton({ icon, onClick, position, className, label }: FloatingActionButtonProps) {
  const style: CSSProperties = {
    bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
    background: 'var(--theme-brand-primary)',
    color: 'var(--theme-text-on-brand)',
    boxShadow: '0 8px 20px -6px rgba(5, 150, 105, 0.55), 0 2px 6px rgba(9, 9, 11, 0.10)',
  }

  // Ensure portal target is ready (SSR-safe, though this app is CSR-only)
  const mounted = useRef(false)
  useEffect(() => { mounted.current = true }, [])

  const button = (
    <button
      onClick={onClick}
      className={cn(fabVariants({ position }), className)}
      style={style}
      aria-label={label}
    >
      {icon}
    </button>
  )

  // Portal to body — escapes any transform/overflow ancestor
  return createPortal(button, document.body)
}
