import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export type SettingCardItem = {
  key: string
  label: string
  desc: string
  icon: React.ElementType
  path: string
  color: string
}

export function SettingCard({ section }: { section: SettingCardItem }) {
  const navigate = useNavigate()
  const Icon = section.icon
  return (
    <button
      onClick={() => navigate(section.path)}
      className="card-interactive p-4 flex items-center gap-4 text-left w-full"
    >
      <div
        className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `color-mix(in srgb, ${section.color} 12%, transparent)` }}
      >
        <Icon className="h-5 w-5" style={{ color: section.color }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{section.label}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>{section.desc}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
    </button>
  )
}
