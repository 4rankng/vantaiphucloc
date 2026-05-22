/**
 * Decoration — SVG decoration components with one-shot reveal.
 *
 * All decorations fire their internal animations when they enter the viewport,
 * then remain in their final state. No loops, no constant CPU use.
 *
 * Available variants:
 * - route-line — horizontal path with origin/waypoint/destination pins
 * - mesh-blob — soft radial gradient background wash
 * - dot-grid — subtle emerald dot pattern (use as background-image)
 * - skyline-port — gantry cranes + containers silhouette
 * - wave-divider — bottom-of-section wave curve
 * - pulse-dot — small "live" indicator with expanding rings
 * - hero-fleet — hero truck on route with map backdrop
 *
 * @param variant — which decoration to render
 * @param width/height — dimensions (default '100%'/'auto')
 * @param threshold — IntersectionObserver threshold (default 0.12)
 * @param delay — additional ms before internal animations start (default 0)
 */

import { memo } from 'react'
import { useInViewRef } from '@/hooks/use-in-view'
import { cn } from '@/lib/utils'

type DecorationVariant =
  | 'route-line'
  | 'mesh-blob'
  | 'dot-grid'
  | 'skyline-port'
  | 'wave-divider'
  | 'pulse-dot'
  | 'hero-fleet'
  | 'container-stack'
  | 'port-crane-mini'
  | 'truck-route'

interface DecorationProps {
  variant: DecorationVariant
  className?: string
  width?: string | number
  height?: string | number
  /** Intersection threshold (0–1). Default 0.12 */
  threshold?: number
  /** Additional delay before internal animations (ms). Default 0 */
  delay?: number
  /** Skip animation (show immediately). Default false */
  disabled?: boolean
  /** aria-label for accessibility. Default '' */
  ariaLabel?: string
}

const PATHS: Record<DecorationVariant, string> = {
  'route-line': '/illustrations/decor-route-line.svg',
  'mesh-blob': '/illustrations/decor-mesh-blob.svg',
  'dot-grid': '/illustrations/decor-dot-grid.svg',
  'skyline-port': '/illustrations/decor-skyline-port.svg',
  'wave-divider': '/illustrations/decor-wave-divider.svg',
  'pulse-dot': '/illustrations/decor-pulse-dot.svg',
  'hero-fleet': '/illustrations/hero-fleet.svg',
  'container-stack': '/illustrations/decor-container-stack.svg',
  'port-crane-mini': '/illustrations/decor-port-crane-mini.svg',
  'truck-route': '/illustrations/decor-truck-route.svg',
}

/**
 * Base decoration component with viewport-triggered activation.
 * Adds .decor-active class when in view, which triggers CSS animations on
 * .decor-path-draw, .decor-pop, .decor-fade-up, .decor-pulse-ring elements.
 */
export const Decoration = memo<DecorationProps>(({
  variant,
  className,
  width = '100%',
  height = 'auto',
  threshold = 0.12,
  delay = 0,
  disabled = false,
  ariaLabel = '',
}) => {
  const [ref, isInView] = useInViewRef<HTMLDivElement>({ threshold, disabled })

  return (
    <div
      ref={ref}
      className={cn(
        'decor-wrapper',
        isInView && 'decor-active',
        className
      )}
      style={
        isInView
          ? ({ '--decor-delay': `${delay}ms` } as React.CSSProperties)
          : undefined
      }
      role="img"
      aria-label={ariaLabel}
    >
      <img
        src={PATHS[variant]}
        alt=""
        width={typeof width === 'number' ? width : undefined}
        height={typeof height === 'number' ? height : undefined}
        style={{ width, height, display: 'block' }}
        loading="lazy"
      />
    </div>
  )
})

Decoration.displayName = 'Decoration'

/**
 * Preset helpers for common placements.
 */

/** Hero banner decoration — skyline + wave */
export const HeroDecoration = memo<{ className?: string }>((props) => (
  <div className={cn('relative', props.className)}>
    <Decoration variant="skyline-port" width="100%" height={140} className="absolute bottom-0 left-0" ariaLabel="bến cảng" />
    <div className="absolute bottom-0 left-0 right-0">
      <Decoration variant="wave-divider" width="100%" height={60} ariaLabel="" />
    </div>
  </div>
))

HeroDecoration.displayName = 'HeroDecoration'

/** Section header decoration — route line to suggest progress */
export const SectionRouteDecoration = memo<{ className?: string }>((props) => (
  <Decoration variant="route-line" width={280} height={80} {...props} ariaLabel="đường đi" />
))

SectionRouteDecoration.displayName = 'SectionRouteDecoration'

/** Status dot — shows "live" state with pulse */
export const LiveDot = memo<{ className?: string; active?: boolean }>(({
  className,
  active = true,
}) => (
  <Decoration
    variant="pulse-dot"
    width={16}
    height={16}
    disabled={!active}
    className={cn('inline-block align-middle', className)}
    ariaLabel={active ? 'đang hoạt động' : 'không hoạt động'}
  />
))

LiveDot.displayName = 'LiveDot'
