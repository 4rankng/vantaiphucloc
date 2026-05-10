import { useParams, useLocation } from 'react-router-dom'
import { Tag } from 'lucide-react'
import { SettingsPageLayout } from '@/components/shared/SettingsPageLayout'
import { PricingClientDetail } from '@/components/shared/Pricing'

export function SettingsPricingDetail() {
  const { clientId } = useParams<{ clientId: string }>()
  const location = useLocation()

  if (location.pathname.startsWith('/accountant/settings')) {
    return (
      <SettingsPageLayout
        title="Bảng giá"
        subtitle="Chi tiết giá theo tuyến"
        icon={Tag}
        iconColor="var(--theme-brand-primary)"
      >
        <PricingClientDetail clientId={Number(clientId)} basePath="/accountant/settings" />
      </SettingsPageLayout>
    )
  }

  return <PricingClientDetail clientId={Number(clientId)} basePath="/accountant" />
}
