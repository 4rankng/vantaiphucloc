import { api } from './client'
import { toCamel, ok, fail } from './utils'

export interface MatchCandidate {
  deliveredTripId: number
  bookedTripId: number
  score: number
  confidence: 'full' | 'partial' | 'none'
  matchedFields: string[]
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
  pairs: Array<{ deliveredTripId: number; bookedTripId: number }>
) {
  try {
    const res = await api.post('/auto-match/confirm', {
      pairs: pairs.map((p) => ({
        delivered_trip_id: p.deliveredTripId,
        booked_trip_id: p.bookedTripId,
      })),
    })
    return ok<ConfirmMatchResponse>(toCamel(res.data))
  } catch (err) {
    return fail<ConfirmMatchResponse>(err)
  }
}
