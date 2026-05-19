export interface PlateProps {
  /** Vehicle plate number, e.g. "51C-12345" */
  children: React.ReactNode
  className?: string
}

export function Plate({ children, className = '' }: PlateProps) {
  return (
    <span
      className={`inline-block rounded font-mono font-semibold text-[12.5px] ${className}`}
      style={{
        background: 'var(--ink)',
        color: '#FFFFFF',
        padding: '2px 6px',
      }}
    >
      {children}
    </span>
  )
}
