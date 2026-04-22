import { useDriverStore } from '@/hooks/use-driver-store'

export function Fab({ to, label }: { to: string; label: string }) {
  const { navigate } = useDriverStore()
  return (
    <button
      onClick={() => navigate(to)}
      className="fixed bottom-6 right-4 w-14 h-14 rounded-2xl flex items-center justify-center z-50 card-lift"
      style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)', boxShadow: 'var(--theme-shadow-elevated)' }}
      aria-label={label}
    >
      <span className="text-2xl leading-none">+</span>
    </button>
  )
}
