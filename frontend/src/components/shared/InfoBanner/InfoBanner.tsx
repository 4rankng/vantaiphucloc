export interface InfoBannerProps {
  children: React.ReactNode
  variant?: 'info' | 'warning' | 'success'
}

export function InfoBanner({ children, variant = 'info' }: InfoBannerProps) {
  const colorMap = {
    info: 'var(--info)',
    warning: 'var(--warning)',
    success: 'var(--success)',
  }
  const bgMap = {
    info: 'var(--info-soft)',
    warning: 'var(--warning-soft)',
    success: 'var(--success-soft)',
  }
  return (
    <div
      className="px-4 py-3"
      style={{ background: bgMap[variant], border: `1px solid ${bgMap[variant]}`, borderRadius: 'var(--r)' }}
    >
      <p className="text-[12.5px] m-0" style={{ color: colorMap[variant] }}>
        {children}
      </p>
    </div>
  )
}
