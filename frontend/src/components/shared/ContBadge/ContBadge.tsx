export function ContBadge({ type }: { type: string }) {
  return (
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
      style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}
    >
      {type}
    </span>
  )
}
