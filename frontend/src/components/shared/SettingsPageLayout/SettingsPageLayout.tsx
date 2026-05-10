import type { ReactNode, ElementType } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'

interface SettingsPageLayoutProps {
  title: string
  subtitle?: string
  icon?: ElementType
  iconColor?: string
  actions?: ReactNode
  children: ReactNode
}

export function SettingsPageLayout({
  title,
  subtitle,
  icon,
  iconColor,
  actions,
  children,
}: SettingsPageLayoutProps) {
  const navigate = useNavigate()

  return (
    <div className="space-y-5">
      <PageHeader
        title={title}
        subtitle={subtitle}
        lucideIcon={icon}
        actions={actions}
        breadcrumbs={
          <button
            onClick={() => navigate('/accountant/settings')}
            className="flex items-center gap-1 text-sm"
            style={{ color: 'var(--theme-text-muted)' }}
          >
            <ChevronLeft size={14} /> Cài đặt
          </button>
        }
      />
      {children}
    </div>
  )
}
