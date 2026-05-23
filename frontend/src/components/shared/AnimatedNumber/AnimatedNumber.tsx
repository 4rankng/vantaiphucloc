import { memo, useEffect, useRef, useState } from 'react'
import { useInViewRef } from '@/hooks/use-in-view'
import { cn } from '@/lib/utils'

interface AnimatedNumberProps {
  value: number
  format?: 'number' | 'currency' | 'compact'
  duration?: number
  className?: string
  disabled?: boolean
}

function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t)
}

function formatCompact(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000_000) {
    const v = abs / 1_000_000_000
    return `${sign}${v % 1 === 0 ? v.toFixed(0) : v.toFixed(2).replace(/0+$/, '')} tỷ`
  }
  if (abs >= 1_000_000) {
    const v = abs / 1_000_000
    return `${sign}${v % 1 === 0 ? v.toFixed(0) : v.toFixed(2).replace(/0+$/, '')} tr`
  }
  return n.toLocaleString('vi-VN')
}

function formatValue(n: number, format: 'number' | 'currency' | 'compact'): string {
  switch (format) {
    case 'currency':
      return n.toLocaleString('vi-VN')
    case 'compact':
      return formatCompact(n)
    case 'number':
    default:
      return n.toLocaleString('vi-VN')
  }
}

export const AnimatedNumber = memo<AnimatedNumberProps>(({
  value,
  format = 'number',
  duration = 600,
  className,
  disabled = false,
}) => {
  const [ref, isInView] = useInViewRef<HTMLSpanElement>({ disabled })
  const [display, setDisplay] = useState(formatValue(0, format))
  const hasAnimated = useRef(false)
  const rafRef = useRef(0)

  useEffect(() => {
    if (!isInView) return

    if (hasAnimated.current) {
      setDisplay(formatValue(Math.round(value), format))
      return
    }

    hasAnimated.current = true

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced || disabled) {
      setDisplay(formatValue(Math.round(value), format))
      return
    }

    const start = performance.now()

    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = easeOut(progress)
      const current = Math.round(eased * value)

      setDisplay(formatValue(current, format))

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(rafRef.current)
  }, [isInView, value, format, duration, disabled])

  return (
    <span ref={ref} className={cn(className)}>
      {display}
    </span>
  )
})

AnimatedNumber.displayName = 'AnimatedNumber'
