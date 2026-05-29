/**
 * Centralized date formatting for the TTransport app.
 *
 * All dates displayed to users should go through `formatDate()` to ensure
 * a consistent DD/MM/YYYY (or DD/MM) format across the entire app.
 *
 * For API calls, use `toISODate()` from utils/salaryPeriod.ts instead.
 */

/**
 * Parse a date-only string (YYYY-MM-DD) as LOCAL midnight to avoid UTC off-by-one.
 * Falls back to `new Date(value)` for datetime strings that include time info.
 */
function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value
  // ISO date-only string (YYYY-MM-DD) — parse as local midnight to avoid
  // UTC timezone shift (e.g. "2026-04-26" UTC midnight = Apr 25 in UTC+7)
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export type DateFormat = 'full' | 'short' | 'compact' | 'month' | 'datetime'

/**
 * Format a date string for display.
 *
 * - `'full'`    → `DD/MM/YYYY`  e.g. "15/03/2026"
 * - `'short'`   → `DD/MM`       e.g. "15/03"
 * - `'compact'` → `DD/MM` if current year, `DD/MM/YYYY` otherwise
 * - `'datetime'` → `DD/MM HH:mm` e.g. "15/03 14:30"
 * - `'month'`   → `MM/YYYY`     e.g. "03/2026"
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
    case 'compact':
      return yyyy === new Date().getFullYear() ? `${dd}/${mm}` : `${dd}/${mm}/${yyyy}`
    case 'datetime':
      return `${dd}/${mm} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    case 'month':
      return `${mm}/${yyyy}`
  }
}
