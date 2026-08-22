import { getRoutePricings } from '@/services/api/routePricings.api'

try {
  await getRoutePricings({ page: 1, pageSize: 1000 })
  document.body.dataset.requestState = 'resolved'
} catch {
  document.body.dataset.requestState = 'rejected'
}
