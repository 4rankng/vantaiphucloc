import { Loader2 } from 'lucide-react'

/**
 * Full-screen overlay shown during a forced update.
 * Vietnamese UI — "Đang cập nhật ứng dụng..."
 */
export function ForceUpdateOverlay() {
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4"
      style={{ background: 'var(--theme-bg-primary)' }}
    >
      <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--theme-brand-primary)' }} />
      <p className="text-lg font-bold" style={{ color: 'var(--theme-text-primary)' }}>
        Đang cập nhật ứng dụng...
      </p>
      <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
        Vui lòng chờ trong giây lát
      </p>
    </div>
  )
}
