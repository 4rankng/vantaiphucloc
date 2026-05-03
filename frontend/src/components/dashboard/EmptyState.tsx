import type { LucideIcon } from 'lucide-react'

/**
 * Pre-defined illustration paths for common empty states.
 * Import and use as `illustration={ILLUSTRATIONS.trips}`.
 */
export const ILLUSTRATIONS = {
  trips:         '/illustrations/empty-trips.svg',
  clients:       '/illustrations/empty-clients.svg',
  search:        '/illustrations/empty-search.svg',
  routes:        '/illustrations/empty-routes.svg',
  pricing:       '/illustrations/empty-pricing.svg',
  matching:      '/illustrations/empty-matching.svg',
  notifications: '/illustrations/empty-notifications.svg',
  error:         '/illustrations/empty-error.svg',
  welcome:       '/illustrations/empty-welcome.svg',
} as const

interface EmptyStateProps {
  /** LucideIcon component — shown when no `illustration` is provided */
  icon?: LucideIcon
  /** Path to an SVG illustration, e.g. ILLUSTRATIONS.trips */
  illustration?: string
  title: string
  description?: string
  /** Optional CTA button */
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon: Icon, illustration, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
      {illustration ? (
        /* ── Illustration mode ── */
        <div
          className="relative flex items-center justify-center rounded-2xl overflow-hidden"
          style={{
            width: 128,
            height: 108,
            background: 'radial-gradient(ellipse at 50% 80%, color-mix(in srgb, var(--theme-brand-primary) 8%, var(--theme-bg-secondary)) 0%, var(--theme-bg-secondary) 70%)',
            border: '1px solid color-mix(in srgb, var(--theme-brand-primary) 10%, var(--theme-border-default))',
          }}
        >
          <img
            src={illustration}
            alt=""
            aria-hidden
            style={{ width: 112, height: 92, objectFit: 'contain', position: 'relative', zIndex: 1 }}
          />
        </div>
      ) : Icon ? (
        /* ── Icon-only mode (backward-compat) ── */
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ background: 'var(--theme-bg-tertiary)' }}
        >
          <Icon className="h-6 w-6" style={{ color: 'var(--theme-text-muted)', opacity: 0.6 }} />
        </div>
      ) : null}

      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
          {title}
        </p>
        {description && (
          <p className="mt-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
            {description}
          </p>
        )}
      </div>

      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold touch-manipulation transition-opacity hover:opacity-90"
          style={{
            background: 'var(--theme-brand-primary)',
            color: '#ffffff',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
