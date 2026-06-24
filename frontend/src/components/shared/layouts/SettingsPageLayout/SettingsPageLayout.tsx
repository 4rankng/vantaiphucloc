import type { ReactNode, ElementType } from 'react'
import { PageHeader } from '@/components/shared/layouts/PageHeader'
import { useIsMobile } from '@/hooks/use-mobile'

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
  breadcrumb,
  children,
}: SettingsPageLayoutProps) {
  const isMobile = useIsMobile(768)
  return (
    <div className="space-y-5">
      {isMobile && breadcrumb ? (
        <div className="flex items-center justify-between gap-3 -mb-1">{breadcrumb}</div>
      ) : null}
      {isMobile ? null : (
        <PageHeader
          title={title}
          subtitle={subtitle}
          lucideIcon={icon}
          actions={actions}
          breadcrumbs={breadcrumb}
        />
      )}
      {actions && isMobile ? (
        <div className="flex items-center gap-2 justify-end -mt-3">{actions}</div>
      ) : null}
      {children}
    </div>
  )
}
