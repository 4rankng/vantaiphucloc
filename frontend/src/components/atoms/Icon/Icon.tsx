import type { LucideIcon } from 'lucide-react'

interface ThemedIconProps {
  icon: LucideIcon
  className?: string
  style?: React.CSSProperties
  color?: string // defaults to var(--theme-text-secondary)
  size?: number | string
}

export function ThemedIcon({ icon: Icon, className, style, color, size }: ThemedIconProps) {
  return (
    <Icon
      className={className}
      style={{ color: color ?? 'var(--theme-text-secondary)', width: size, height: size, ...style }}
    />
  )
}
