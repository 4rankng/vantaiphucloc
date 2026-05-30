import type { ReactNode, ElementType } from 'react'
import { PageHeader } from '@/components/shared/layouts/PageHeader'

interface SettingsPageLayoutProps {
  title: string
  subtitle?: string
  icon?: ElementType
  iconColor?: string
  actions?: ReactNode
  children: ReactNode
  breadcrumb?: ReactNode
}

export function SettingsPageLayout({
  title,
  subtitle,
  icon,
  actions,
  children,
  breadcrumb,
}: SettingsPageLayoutProps) {
  return (
    <div className="space-y-5">
      <PageHeader
        title={title}
        subtitle={subtitle}
        lucideIcon={icon}
        actions={actions}
        breadcrumbs={breadcrumb}
      />
      {children}
    </div>
  )
}
