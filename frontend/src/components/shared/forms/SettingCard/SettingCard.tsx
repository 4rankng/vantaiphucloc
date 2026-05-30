import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

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
      className="group card-interactive p-6 flex flex-col gap-4 text-left w-full"
    >
      {/* Icon */}
      <div
        className="h-12 w-12 rounded-2xl flex items-center justify-center"
        style={{ background: `color-mix(in srgb, ${section.color} 15%, transparent)` }}
      >
        <Icon className="h-6 w-6" style={{ color: section.color }} />
      </div>

      {/* Text */}
      <div className="flex-1 space-y-1">
        <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--theme-text-primary)' }}>
          {section.label}
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--theme-text-muted)' }}>
          {section.desc}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-1" style={{ color: section.color }}>
        <span className="text-xs font-medium">Xem chi tiết</span>
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  )
}
