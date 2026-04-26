import type { LucideIcon } from 'lucide-react'

export function InfoRow({ icon: Icon, label, value, noBorder }: {
  icon?: LucideIcon
  label: string
  value: string
  noBorder?: boolean
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{ borderBottom: noBorder ? 'none' : '1px solid var(--theme-border-light)' }}
    >
      {Icon && (
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--theme-bg-tertiary)' }}>
          <Icon className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-muted)' }} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>{label}</p>
        <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>{value}</p>
      </div>
    </div>
  )
}
