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

export interface AISuggestionResponse {
  suggestedBookedTripId: number | null
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
  pairs: Array<{ deliveredTripId: number; bookedTripId: number; syncSource?: string | null }>
) {
  try {
    const res = await api.post('/auto-match/confirm', {
      pairs: pairs.map((p) => ({
        delivered_trip_id: p.deliveredTripId,
        booked_trip_id: p.bookedTripId,
        sync_source: p.syncSource || null,
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
