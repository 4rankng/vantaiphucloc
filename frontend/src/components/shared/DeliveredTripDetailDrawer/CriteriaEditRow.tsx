import React from 'react'

export function CriteriaEditRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1 min-w-0 text-[12px]">
      <span className="shrink-0" style={{ color: 'var(--ink-3)' }}>
        {label}:
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
