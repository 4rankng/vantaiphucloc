/**
 * useInView — IntersectionObserver with prefers-reduced-motion guard.
 *
 * Fires once when element enters viewport, then stops observing.
 * Respects user motion preferences, never auto-runs loops.
 *
 * @param threshold — 0–1, fraction of element visible before firing (default 0.15)
 * @param rootMargin — CSS margin string to expand/contract root bounds (default '0px')
 * @returns boolean — true once element has entered viewport
 */

import { useEffect, useRef, useState } from 'react'

interface UseInViewOptions {
  /** Fraction of element visible before firing (0–1). Default 0.15 */
  threshold?: number
  /** Margin around root. Default '0px' */
  rootMargin?: string
  /** Disable motion entirely (forces immediate true). Default false */
  disabled?: boolean
}

export function useInView({
  threshold = 0.15,
  rootMargin = '0px',
  disabled = false,
}: UseInViewOptions = {}): boolean {
  const [isInView, setIsInView] = useState(disabled)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (disabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsInView(true)
      return
    }

    // Respect prefers-reduced-motion: treat as already in-view (no animation)
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      setIsInView(true)
      return
    }

    const element = document.querySelector<HTMLElement>('[data-in-view-target]')
    if (!element) return

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observerRef.current?.disconnect()
        }
      },
      { threshold, rootMargin }
    )

    observerRef.current.observe(element)

    return () => {
      observerRef.current?.disconnect()
    }
  }, [threshold, rootMargin, disabled])

  return isInView
}

/**
 * Hook version that accepts a ref directly.
 * Use this when you need multiple observers in one component.
 */
export function useInViewRef<T extends HTMLElement>(
  options: UseInViewOptions = {}
): [React.RefObject<T>, boolean] {
  const { threshold = 0.15, rootMargin = '0px', disabled = false } = options
  const [isInView, setIsInView] = useState(disabled)
  const ref = useRef<T>(null)

  useEffect(() => {
    if (disabled || !ref.current) {
      if (disabled) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsInView(true)
      }
      return
    }

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      setIsInView(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [threshold, rootMargin, disabled])

  return [ref, isInView]
}
