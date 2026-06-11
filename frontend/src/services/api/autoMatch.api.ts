import { api } from './client'
import { toCamel, ok, fail } from './utils'

export interface TripSummary {
  tripDate: string | null
  contNumber: string | null
  clientName: string | null
  pickupName: string | null
  dropoffName: string | null
  workType: string | null
  vessel: string | null
  vehiclePlate: string | null
}

export interface MatchCandidate {
  deliveredTripId: number
  bookedTripId: number
  score: number
  confidence: 'full' | 'partial' | 'none'
  matchedFields: string[]
  delivered: TripSummary
  booked: TripSummary
}

export interface AutoMatchPreviewResponse {
  candidates: MatchCandidate[]
  unmatchedCount: number
  scannedCount: number
}

export interface ConfirmMatchResponse {
  matchedCount: number
  errors: string[]
}

export interface BookedTripSummary {
  contNumber: string | null
  tripDate: string | null
  clientName: string | null
  pickupName: string | null
  dropoffName: string | null
  vessel: string | null
  workType: string | null
  vehiclePlate: string | null
}

export interface AISuggestionResponse {
  suggestedBookedTripId: number | null
  bookedTripSummary: BookedTripSummary | null
  reasoning: string
  confidence: 'high' | 'medium' | 'low' | 'none'
  error?: string
}

export interface UnmatchResponse {
  ok: boolean
  bookedTripId: number | null
}

export async function autoMatchPreview(params: {
  dateFrom?: string
  dateTo?: string
}) {
  try {
    const res = await api.post('/auto-match/preview', {
      date_from: params.dateFrom || null,
      date_to: params.dateTo || null,
    })
    return ok<AutoMatchPreviewResponse>(toCamel(res.data))
  } catch (err) {
    return fail<AutoMatchPreviewResponse>(err)
  }
}

export async function confirmAutoMatch(
  pairs: Array<{
    deliveredTripId: number
    bookedTripId: number
    syncSource?: string | null
    fieldChoices?: Record<string, 'delivered' | 'booked'> | null
    score?: number | null
  }>
) {
  try {
    const res = await api.post('/auto-match/confirm', {
      pairs: pairs.map((p) => ({
        delivered_trip_id: p.deliveredTripId,
        booked_trip_id: p.bookedTripId,
        sync_source: p.syncSource || null,
        field_choices: p.fieldChoices || null,
        score: p.score ?? null,
      })),
    })
    return ok<ConfirmMatchResponse>(toCamel(res.data))
  } catch (err) {
    return fail<ConfirmMatchResponse>(err)
  }
}

export async function aiSuggestMatch(deliveredTripId: number) {
  try {
    const res = await api.post(`/auto-match/ai-suggest/${deliveredTripId}`)
    return ok<AISuggestionResponse>(toCamel(res.data))
  } catch (err) {
    return fail<AISuggestionResponse>(err)
  }
}

export async function unmatchTrip(deliveredTripId: number) {
  try {
    const res = await api.post('/auto-match/unmatch', { delivered_trip_id: deliveredTripId })
    return ok<UnmatchResponse>(toCamel(res.data))
  } catch (err) {
    return fail<UnmatchResponse>(err)
  }
}

export interface SyncPricingResponse {
  updatedCount: number
}

export async function syncPricing(params: {
  dateFrom: string
  dateTo: string
}) {
  try {
    const res = await api.post('/auto-match/sync-pricing', {
      date_from: params.dateFrom,
      date_to: params.dateTo,
    })
    return ok<SyncPricingResponse>(toCamel(res.data))
  } catch (err) {
    return fail<SyncPricingResponse>(err)
  }
}


export async function syncAllPricing() {
  try {
    const res = await api.post('/auto-match/sync-all-pricing', {})
    return ok<SyncPricingResponse>(toCamel(res.data))
  } catch (err) {
    return fail<SyncPricingResponse>(err)
  }
}
