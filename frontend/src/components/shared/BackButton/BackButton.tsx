import { ArrowLeft } from 'lucide-react'
import { useDriverStore } from '@/hooks/use-driver-store'

export function BackButton({ label = 'Quay lại', onClick }: { label?: string; onClick?: () => void }) {
  const { goBack: driverGoBack } = useDriverStore()
  const handleBack = onClick ?? driverGoBack
  return (
    <button
      onClick={handleBack}
      className="flex items-center gap-1.5 text-sm font-semibold pb-3"
      style={{ color: 'var(--theme-brand-primary)' }}
    >
      <ArrowLeft className="w-4 h-4" />
      {label}
    </button>
  )
}
