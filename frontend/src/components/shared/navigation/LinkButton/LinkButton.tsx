import { Link } from 'react-router-dom'

type BaseProps = {
  icon?: React.ElementType
  disabled?: boolean
  className?: string
  children?: React.ReactNode
}

type LinkButtonAsButton = BaseProps & {
  onClick: () => void
  to?: never
}

type LinkButtonAsLink = BaseProps & {
  to: string
  onClick?: never
  disabled?: never
}

export type LinkButtonProps = LinkButtonAsButton | LinkButtonAsLink

export function LinkButton({
  icon: Icon,
  disabled,
  className,
  children,
  ...rest
}: LinkButtonProps) {
  const style = { color: 'var(--theme-brand-primary-dark)' }

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
