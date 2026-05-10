import { useLocation } from 'react-router-dom'
import { Tag } from 'lucide-react'
import { SettingsPageLayout } from '@/components/shared/SettingsPageLayout'
import { PricingClientCards } from '@/components/shared/Pricing'

export function SettingsPricingList() {
  const location = useLocation()

  if (location.pathname.startsWith('/accountant/settings')) {
    return (
      <SettingsPageLayout
        title="Bảng giá"
        subtitle="Giá vận chuyển theo tuyến & khách hàng"
        icon={Tag}
        iconColor="var(--theme-brand-primary)"
      >
        <PricingClientCards basePath="/accountant/settings" />
      </SettingsPageLayout>
    )
  }

  return <PricingClientCards basePath="/accountant" />
}
