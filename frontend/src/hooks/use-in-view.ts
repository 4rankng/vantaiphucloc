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

import { useCallback, useEffect, useRef, useState } from 'react'

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
): [(node: T | null) => void, boolean] {
  const { threshold = 0.15, rootMargin = '0px', disabled = false } = options
  const [isInView, setIsInView] = useState(disabled)
  // Use a callback ref so the effect runs the moment the DOM node is attached,
  // not on the first render when ref.current is still null. The old
  // useRef + useEffect combo raced with React's commit phase and sometimes
  // left the observer unattached → wrappers stuck at opacity:0 forever
  // (see Tổng quan accountant page blank-on-first-load regression).
  const [node, setNode] = useState<T | null>(null)
  const ref = useCallback((n: T | null) => setNode(n), [])

  useEffect(() => {
    if (disabled) {
       
      setIsInView(true)
      return
    }
    if (!node) return

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

    observer.observe(node)

    // Safety net: if for any reason the observer hasn't fired in 300ms
    // (e.g. a layout race with sticky headers), force-reveal so the user
    // never sees a permanently-blank section. The animation window has
    // already elapsed by then.
    const timeoutId = window.setTimeout(() => {
      setIsInView(true)
      observer.disconnect()
    }, 300)

    return () => {
      observer.disconnect()
      window.clearTimeout(timeoutId)
    }
  }, [node, threshold, rootMargin, disabled])

  return [ref, isInView]
}
