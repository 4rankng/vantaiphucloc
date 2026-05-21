/**
 * Reveal — one-shot viewport-entrance animation wrapper.
 *
 * Wraps children, fades them in once they enter the viewport.
 * Uses springy easing matching the design system (cubic-bezier 0.34, 1.56, 0.64, 1).
 *
 * @param delay — ms before animation starts (default 0)
 * @param distance — px to slide up (default 12)
 * @param threshold — IntersectionObserver threshold (default 0.12)
 * @param disabled — skip animation entirely (default false)
 */

import { Children, type ReactNode, memo } from 'react'
import { useInViewRef } from '@/hooks/use-in-view'
import { cn } from '@/lib/utils'

interface RevealProps {
  children: ReactNode
  className?: string
  /** Animation start delay in ms. Default 0 */
  delay?: number
  /** Distance to slide up (px). Default 12 */
  distance?: number
  /** Intersection threshold (0–1). Default 0.12 */
  threshold?: number
  /** Skip animation (show immediately). Default false */
  disabled?: boolean
  /** Element to render as. Default 'div' */
  as?: keyof JSX.IntrinsicElements
}

export const Reveal = memo<RevealProps>(({
  children,
  className,
  delay = 0,
  distance = 12,
  threshold = 0.12,
  disabled = false,
  as: Tag = 'div',
}) => {
  const [ref, isInView] = useInViewRef<HTMLDivElement>({ threshold, disabled })

  return (
    <Tag
      ref={ref}
      className={cn(
        'reveal-wrapper',
        isInView && 'reveal-active',
        className
      )}
      style={
        isInView
          ? { '--reveal-delay': `${delay}ms`, '--reveal-distance': `${distance}px` } as React.CSSProperties
          : undefined
      }
    >
      {children}
    </Tag>
  )
})

Reveal.displayName = 'Reveal'

/**
 * RevealList — staggers children automatically.
 * Wraps an array and assigns delays via index.
 */
interface RevealListProps extends Omit<RevealProps, 'delay'> {
  /** Stagger delay between each child (ms). Default 80 */
  stagger?: number
  children: ReactNode[]
}

export const RevealList = memo<RevealListProps>(({
  children,
  stagger = 80,
  threshold = 0.12,
  disabled = false,
  className,
  as: Tag = 'div',
}) => {
  const [ref, isInView] = useInViewRef<HTMLDivElement>({ threshold, disabled })

  return (
    <Tag ref={ref} className={cn('reveal-list', className)}>
      {Children.toArray(children).map((child, i) =>
        child != null ? (
          <div
            key={i}
            className={cn('reveal-wrapper', isInView && 'reveal-active')}
            style={
              isInView
                ? {
                    '--reveal-delay': `${i * stagger}ms`,
                    '--reveal-distance': '12px',
                  } as React.CSSProperties
                : undefined
            }
          >
            {child}
          </div>
        ) : null
      )}
    </Tag>
  )
})

RevealList.displayName = 'RevealList'
