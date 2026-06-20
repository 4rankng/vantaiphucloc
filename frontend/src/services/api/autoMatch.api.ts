import { api } from './client'
import { safeRequest } from '@/lib/safe-request'

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

export function autoMatchPreview(params: {
  dateFrom?: string
  dateTo?: string
}) {
  return safeRequest<AutoMatchPreviewResponse>(() => api.post('/auto-match/preview', {
    date_from: params.dateFrom || null,
    date_to: params.dateTo || null,
  }))
}

export function confirmAutoMatch(
  pairs: Array<{
    deliveredTripId: number
    bookedTripId: number
    syncSource?: string | null
    fieldChoices?: Record<string, 'delivered' | 'booked'> | null
    score?: number | null
  }>,
) {
  return safeRequest<ConfirmMatchResponse>(() => api.post('/auto-match/confirm', {
    pairs: pairs.map((p) => ({
      delivered_trip_id: p.deliveredTripId,
      booked_trip_id: p.bookedTripId,
      sync_source: p.syncSource || null,
      field_choices: p.fieldChoices || null,
      score: p.score ?? null,
    })),
  }))
}

export function aiSuggestMatch(deliveredTripId: number) {
  return safeRequest<AISuggestionResponse>(() => api.post(`/auto-match/ai-suggest/${deliveredTripId}`))
}

export function unmatchTrip(deliveredTripId: number) {
  return safeRequest<UnmatchResponse>(() => api.post('/auto-match/unmatch', { delivered_trip_id: deliveredTripId }))
}

export interface SyncPricingResponse {
  updatedCount: number
}

export function syncPricing(params: {
  dateFrom: string
  dateTo: string
}) {
  return safeRequest<SyncPricingResponse>(() => api.post('/auto-match/sync-pricing', {
    date_from: params.dateFrom,
    date_to: params.dateTo,
  }))
}

export function syncAllPricing() {
  return safeRequest<SyncPricingResponse>(() => api.post('/auto-match/sync-all-pricing', {}))
}
