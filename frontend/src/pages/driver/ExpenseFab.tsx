import { Plus } from 'lucide-react'
import { useDriverStore } from '@/hooks/use-driver-store'

export function ExpenseFab() {
  const { navigate } = useDriverStore()
  return (
    <button
      onClick={() => navigate('/driver/expenses/new')}
      className="fixed bottom-6 right-4 w-14 h-14 rounded-2xl flex items-center justify-center z-50 card-lift"
      style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)', boxShadow: 'var(--theme-shadow-elevated)' }}
      aria-label="Thêm chi phí"
    >
      <Plus className="w-6 h-6" />
    </button>
  )
}
