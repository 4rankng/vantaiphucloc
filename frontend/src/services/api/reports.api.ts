import { api } from './client'

export interface CustomerSettlementParams {
  clientId: number
  year: number
  month: number
  // Optional explicit period override; when provided, overrides year/month server-side
  startDate?: string
  endDate?: string
}

export interface ExportedFile {
  blob: Blob
  filename: string
}

const DISPOSITION_RE = /filename\*?=(?:UTF-8''|")?([^";]+)/i

function parseFilename(disposition: string | undefined, fallback: string): string {
  if (!disposition) return fallback
  const m = disposition.match(DISPOSITION_RE)
  if (!m) return fallback
  try {
    return decodeURIComponent(m[1])
  } catch {
    return m[1]
  }
}

export async function exportCustomerSettlement(
  params: CustomerSettlementParams,
): Promise<ExportedFile> {
  const search = new URLSearchParams()
  search.append('client_id', String(params.clientId))
  if (params.startDate && params.endDate) {
    search.append('start_date', params.startDate)
    search.append('end_date', params.endDate)
  } else {
    search.append('year', String(params.year))
    search.append('month', String(params.month))
  }
  const res = await api.get(`/reports/customer-settlement/export?${search.toString()}`, {
    responseType: 'blob',
  })
  const filename = parseFilename(
    res.headers['content-disposition'] as string | undefined,
    `bao_cao_${params.year}_${String(params.month).padStart(2, '0')}.xlsx`,
  )
  return { blob: res.data as Blob, filename }
}
