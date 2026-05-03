import type { CSSProperties } from 'react'

/**
 * Branded PNG icons stored in `frontend/public/icons/`.
 * Use semantic names — keep this list in sync with files in that folder.
 */
export type BrandIconName =
  | 'analytics'
  | 'team'
  | 'truck'
  | 'route'
  | 'package'
  | 'warehouse'
  | 'invoice'
  | 'document'
  | 'schedule'
  | 'settings'
  | 'money'
  | 'calkey'

const ICON_MAP: Record<BrandIconName, string> = {
  analytics: '/icons/icon_analytics.png',
  team: '/icons/icon_team.png',
  truck: '/icons/icon_truck.png',
  route: '/icons/icon_route.png',
  package: '/icons/icon_package.png',
  warehouse: '/icons/icon_warehouse.png',
  invoice: '/icons/icon_invoice.png',
  document: '/icons/icon_document.png',
  schedule: '/icons/icon_schedule.png',
  settings: '/icons/icon_settings.png',
  money: '/icons/money.png',
  calkey: '/icons/calkey.png',
}

interface BrandIconProps {
  name: BrandIconName
  /** Pixel size or tailwind size class. Default 24px. */
  size?: number
  className?: string
  style?: CSSProperties
  /** When set, the icon is treated as decorative (aria-hidden). Default true. */
  decorative?: boolean
  alt?: string
}

/**
 * Renders a branded PNG icon from `/public/icons/`.
 *
 * Usage:
 *   <BrandIcon name="truck" size={32} />
 *   <BrandIcon name="calkey" className="w-32 h-32" />
 */
export function BrandIcon({
  name,
  size = 24,
  className,
  style,
  decorative = true,
  alt,
}: BrandIconProps) {
  const src = ICON_MAP[name]

  // If a className with width/height utility classes is provided, prefer that
  // and skip the inline pixel sizing so callers can use `w-9 h-9` etc.
  const hasSizeClass = !!className && /\b(w-|h-)/.test(className)

  return (
    <img
      src={src}
      alt={decorative ? '' : alt ?? name}
      aria-hidden={decorative}
      draggable={false}
      className={`object-contain ${className ?? ''}`.trim()}
      style={
        hasSizeClass
          ? style
          : { width: size, height: size, ...style }
      }
    />
  )
}
