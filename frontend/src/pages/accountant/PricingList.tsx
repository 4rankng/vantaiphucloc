import { PageHeader } from '@/components/shared/PageHeader'
import { PricingClientCards } from '@/components/shared/Pricing'

export function PricingList() {
  return (
    <div>
      <PageHeader title="Bảng giá" subtitle="Giá vận chuyển theo tuyến & khách hàng" />
      <PricingClientCards basePath="/accountant" />
    </div>
  )
}
