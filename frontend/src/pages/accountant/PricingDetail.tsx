import { useParams } from 'react-router-dom'
import { PricingClientDetail } from '@/components/shared/Pricing'

export function PricingDetail() {
  const { clientId } = useParams<{ clientId: string }>()
  return <PricingClientDetail clientId={Number(clientId)} basePath="/accountant" />
}
