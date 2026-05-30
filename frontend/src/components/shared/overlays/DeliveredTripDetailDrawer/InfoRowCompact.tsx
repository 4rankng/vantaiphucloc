import React from 'react'

export function InfoRowCompact({
  icon: Icon,
  label,
  value,
  noBorder,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  noBorder?: boolean
}) {
  return (
    <div
      className="flex items-center gap-3 px-3.5 py-2 text-[13px]"
      style={{ borderBottom: noBorder ? 'none' : '1px solid var(--line)' }}
    >
      <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--ink-3)' }} />
      <span className="shrink-0" style={{ color: 'var(--ink-3)', minWidth: 72 }}>
        {label}
      </span>
      <span className="min-w-0" style={{ color: 'var(--ink)' }}>
        {value}
      </span>
    </div>
  )
}
