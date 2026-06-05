import { useParams, useLocation } from 'react-router-dom'
import { PricingClientDetail } from '@/components/shared/data-display/Pricing'

export function PricingDetail() {
  const { clientId } = useParams<{ clientId: string }>()
  const { pathname } = useLocation()
  const basePath = pathname.startsWith('/superadmin') ? '/superadmin' : '/director'
  return <PricingClientDetail clientId={Number(clientId)} basePath={basePath} />
}
