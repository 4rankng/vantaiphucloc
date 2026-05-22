/** Format an ISO date string as DD/MM. Returns '—' for null/empty. */
export function fmtDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function pad(n: number): string {
  return String(n).padStart(2, '0')
}
