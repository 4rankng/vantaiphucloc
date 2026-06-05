import { useLocation } from 'react-router-dom'
import { PricingClientCards } from '@/components/shared/data-display/Pricing'

export function PricingList() {
  const { pathname } = useLocation()
  const basePath = pathname.startsWith('/superadmin') ? '/superadmin' : '/director'
  return <PricingClientCards basePath={basePath} />
}
