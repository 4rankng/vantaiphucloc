/** Reusable detail row for modal/panel detail views */
export function DetailRow({ label, children, noBorder }: { label: string; children: React.ReactNode; noBorder?: boolean }) {
  return (
    <div className={`flex justify-between py-2 text-sm ${noBorder ? '' : 'border-b border-[var(--theme-border-light,var(--theme-border-default))]'}`}>
      <span className="text-[var(--theme-text-muted)]">{label}</span>
      <span className="text-[var(--theme-text-primary)] text-right max-w-[60%]">{children}</span>
    </div>
  )
}

/** Container for a list of DetailRow */
export function DetailList({ children }: { children: React.ReactNode }) {
  return <div className="space-y-0">{children}</div>
}
