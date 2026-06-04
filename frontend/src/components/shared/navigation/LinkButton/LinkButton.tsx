import { Link } from 'react-router-dom'
import type { ElementType, ReactNode, MouseEvent } from 'react'

type BaseProps = {
  icon?: ElementType
  disabled?: boolean
  className?: string
  children?: ReactNode
  variant?: 'brand' | 'muted'
}

type LinkButtonAsButton = BaseProps & {
  onClick: (e: MouseEvent<HTMLButtonElement>) => void
  to?: never
}

type LinkButtonAsLink = BaseProps & {
  to: string
  onClick?: never
}

export type LinkButtonProps = LinkButtonAsButton | LinkButtonAsLink

export function LinkButton({
  icon: Icon,
  disabled,
  className,
  children,
  variant = 'brand',
  ...rest
}: LinkButtonProps) {
  const style = {
    color: variant === 'brand'
      ? 'var(--theme-brand-primary-dark)'
      : 'var(--theme-text-muted)',
  }

  const sharedClass = [
    'inline-flex items-center gap-1.5 text-xs font-medium transition-opacity',
    disabled && 'opacity-50 cursor-not-allowed',
    !disabled && 'hover:opacity-80',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </>
  )

  if ('to' in rest && rest.to) {
    if (disabled) {
      return (
        <span className={sharedClass} style={style}>
          {content}
        </span>
      )
    }
    return (
      <Link to={rest.to} className={sharedClass} style={style}>
        {content}
      </Link>
    )
  }

  const { onClick } = rest as LinkButtonAsButton
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={sharedClass}
      style={style}
    >
      {content}
    </button>
  )
}

