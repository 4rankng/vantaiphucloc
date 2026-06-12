export type ImportStep = 'upload' | 'preview' | 'done'

export const IMPORT_STEPS = [
  { label: 'Nhập file' },
  { label: 'Soát duyệt' },
  { label: 'Lưu dữ liệu' },
] as const

export function stepIndex(step: ImportStep): number {
  return step === 'upload' ? 0 : step === 'preview' ? 1 : 2
}

export const NUMERIC_COLS = new Set(['Cước'])

export interface PreviewRow {
  [key: string]: unknown
}

/** Transform a PreviewResultDto's accepted/rejected arrays into table-ready data. */
export function transformPreviewToTable(data: {
  accepted?: { values: Record<string, unknown> }[]
  rejected?: { source_row_index: number; reasons?: string[]; raw?: Record<string, unknown> }[]
  warnings?: string[]
}) {
  const cols = ['Ngày đi', 'Số tàu', 'Chủ hàng', 'Số Cont', 'Loại Cont', 'Tác nghiệp', 'Số xe chạy', 'Điểm đi', 'Điểm đến', 'Cước']
  const rows = (data.accepted ?? []).map(r => ({
    'Ngày đi': r.values.trip_date,
    'Số tàu': r.values.vessel,
    'Chủ hàng': r.values.consignee,
    'Số Cont': r.values.container_no,
    'Loại Cont': r.values.cont_type ?? `${r.values.freight_kind ?? ''}${r.values.container_size ?? ''}`,
    'Tác nghiệp': r.values.work_type ?? '',
    'Số xe chạy': r.values.vehicle_plate,
    'Điểm đi': r.values.pickup_location,
    'Điểm đến': r.values.dropoff_location,
    'Cước': r.values.freight_charge,
  }))

  const containerKey = Object.keys((data.rejected?.[0]?.raw ?? {}) as Record<string, unknown>).find(k => k === 'container_no') ?? Object.keys((data.rejected?.[0]?.raw ?? {}) as Record<string, unknown>).find(k => k !== 'container_no' && /container/i.test(k))
  const duplicateGroups = (data.rejected ?? [])
    .filter(r => r.reasons?.includes('duplicate_in_file') || r.reasons?.some(reason => reason.includes('duplicate')))
    .map((r) => {
      const cNo = containerKey ? String((r.raw as Record<string, unknown>)?.[containerKey] ?? '') : String((r.raw as Record<string, unknown>)?.container_no ?? '')
      return {
        type: 'exact' as const,
        rowIndices: [r.source_row_index],
        containers: [cNo],
        message: cNo ? `Dòng ${r.source_row_index + 1}: Trùng container ${cNo}` : `Dòng ${r.source_row_index + 1}: Trùng dòng`,
      }
    })

  const warnings = data.warnings ?? []

  return { cols, rows, duplicateGroups, warnings }
}
