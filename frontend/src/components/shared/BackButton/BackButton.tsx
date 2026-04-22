import { ArrowLeft } from 'lucide-react'
import { useDriverStore } from '@/hooks/use-driver-store'

export function BackButton({ to, label = 'Quay lại' }: { to?: string; label?: string }) {
  const { navigate } = useDriverStore()
  return (
    <button
      onClick={() => navigate(to || '/driver')}
      className="flex items-center gap-1.5 text-sm font-semibold pb-3"
      style={{ color: 'var(--theme-brand-primary)' }}
    >
      <ArrowLeft className="w-4 h-4" />
      {label}
    </button>
  )
}
