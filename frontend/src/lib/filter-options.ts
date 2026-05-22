export type FilterValue = 'ALL' | 'PENDING'

export const DRIVER_HISTORY_FILTER_OPTIONS: { value: FilterValue; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'PENDING', label: 'Chờ ghép' },
]
