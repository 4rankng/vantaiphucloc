import { ArrowLeft } from 'lucide-react'

export function BackButton({ fallback = '/driver', label = 'Quay lại' }: { fallback?: string; label?: string }) {
  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back()
    } else {
      window.location.hash = '#' + fallback
    }
  }
  return (
    <button
      onClick={goBack}
      className="flex items-center gap-1.5 text-sm font-semibold pb-3"
      style={{ color: 'var(--theme-brand-primary)' }}
    >
      <ArrowLeft className="w-4 h-4" />
      {label}
    </button>
  )
}
