import { useParams } from 'react-router-dom'
import { PricingClientDetail } from '@/components/shared/data-display/Pricing'

export function PricingDetail() {
  const { clientId } = useParams<{ clientId: string }>()
  return <PricingClientDetail clientId={Number(clientId)} basePath="/director" />
}
