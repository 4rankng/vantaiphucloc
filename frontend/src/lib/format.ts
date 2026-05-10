/**
 * Centralized date formatting for the TTransport app.
 *
 * All dates displayed to users should go through `formatDate()` to ensure
 * a consistent DD/MM/YYYY (or DD/MM) format across the entire app.
 *
 * For API calls, use `toISODate()` from utils/salaryPeriod.ts instead.
 */

/** Parse a date string (ISO, locale, or Date) into a Date object. Returns null if invalid. */
function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export type DateFormat = 'full' | 'short' | 'month'

/**
 * Format a date string for display.
 *
 * - `'full'`  → `DD/MM/YYYY`  e.g. "15/03/2026"
 * - `'short'` → `DD/MM`       e.g. "15/03"
 * - `'month'` → `MM/YYYY`     e.g. "03/2026"
 *
 * Returns `'—'` for null/undefined/invalid input.
 */
export function formatDate(
  value: string | Date | null | undefined,
  format: DateFormat = 'short',
): string {
  const d = parseDate(value)
  if (!d) return '—'

  const dd = pad(d.getDate())
  const mm = pad(d.getMonth() + 1)
  const yyyy = d.getFullYear()

  switch (format) {
    case 'full':
      return `${dd}/${mm}/${yyyy}`
    case 'short':
      return `${dd}/${mm}`
    case 'month':
      return `${mm}/${yyyy}`
  }
}

/**
 * Format a date range for display.
 *
 * Returns "DD/MM – DD/MM" or "DD/MM/YYYY – DD/MM/YYYY" depending on format.
 */
export function formatDateRange(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined,
  format: DateFormat = 'short',
): string {
  const s = formatDate(start, format)
  const e = formatDate(end, format)
  if (s === '—' || e === '—') return s === '—' ? e : s
  return `${s} → ${e}`
}
