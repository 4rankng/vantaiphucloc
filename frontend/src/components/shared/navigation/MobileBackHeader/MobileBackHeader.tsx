import { useNavigate } from 'react-router-dom'

interface MobileBackHeaderProps {
  /** Page title displayed next to the back arrow */
  title: string
  /** Override default back navigation (`navigate(-1)`) */
  onBack?: () => void
  /** Additional class on the outer wrapper */
  className?: string
}

/**
 * Mobile page header with back arrow + title.
 * Used by driver pages (mobile-first layout).
 */
export function MobileBackHeader({ title, onBack, className = '' }: MobileBackHeaderProps) {
  const navigate = useNavigate()
  const handleBack = onBack ?? (() => navigate(-1))

  return (
    <div className={`flex items-center gap-2 mb-1 ${className}`}>
      <button
        onClick={handleBack}
        className="inline-flex items-center gap-1 text-sm font-medium shrink-0"
        style={{ color: 'var(--theme-text-secondary)' }}
        aria-label="Quay lại"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>
      <h1
        className="text-base font-bold truncate"
        style={{ color: 'var(--theme-text-primary)', letterSpacing: '-0.01em' }}
      >
        {title}
      </h1>
    </div>
  )
}
