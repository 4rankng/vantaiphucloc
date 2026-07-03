import React from 'react'

export function CriteriaEditRow({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between gap-2 px-3 py-3 bg-[var(--surface)] text-[13px] transition-colors hover:bg-[var(--surface-2)] sm:px-4 ${className}`}>
      <span className="min-w-0 max-w-[46%] truncate text-[var(--ink-3)] font-medium">{label}</span>
      <div className="min-w-0 flex-1 flex justify-end text-right">
        {children}
      </div>
    </div>
  )
}
