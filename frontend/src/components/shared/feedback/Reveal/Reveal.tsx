import { Children, type ReactNode, memo } from 'react'
import { useInViewRef } from '@/hooks/use-in-view'
import { cn } from '@/lib/utils'

type RevealDirection = 'up' | 'left' | 'right' | 'scale'

const DIR_CLASS: Record<RevealDirection, string> = {
  up: 'reveal-dir-up',
  left: 'reveal-dir-left',
  right: 'reveal-dir-right',
  scale: 'reveal-dir-scale',
}

interface RevealProps {
  children: ReactNode
  className?: string
  delay?: number
  distance?: number
  threshold?: number
  disabled?: boolean
  direction?: RevealDirection
  as?: keyof JSX.IntrinsicElements
}

export const Reveal = memo<RevealProps>(({
  children,
  className,
  delay = 0,
  distance = 12,
  threshold = 0.12,
  disabled = false,
  direction = 'up',
  as: Tag = 'div',
}) => {
  const [ref, isInView] = useInViewRef<HTMLDivElement>({ threshold, disabled })

  return (
    <Tag
      ref={ref}
      className={cn(
        'reveal-wrapper',
        DIR_CLASS[direction],
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

interface RevealListProps extends Omit<RevealProps, 'delay'> {
  stagger?: number
  children: ReactNode[]
}

export const RevealList = memo<RevealListProps>(({
  children,
  stagger = 80,
  threshold = 0.12,
  disabled = false,
  direction = 'up',
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
            className={cn('reveal-wrapper', DIR_CLASS[direction], isInView && 'reveal-active')}
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
