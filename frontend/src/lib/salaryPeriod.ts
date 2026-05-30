/**
 * Salary period date calculation — mirrors backend's `period_dates_for()`.
 *
 * Salary periods are defined by settings: salary_from_day (1–31) and salary_to_day (1–31).
 * Periods are always ~full month: either same-month (from_day <= to_day, e.g. 1→31)
 * or cross-month (from_day > to_day, e.g. 26→25th next month).
 */

function safeDate(year: number, month: number, day: number): Date {
  const maxDay = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(day, maxDay))
}

export interface SalaryConfig {
  fromDay: number
  toDay: number
}

/**
 * Returns the (startDate, endDate) of the salary period containing `referenceDate`.
 * Both dates are start-of-day (00:00:00) for startDate and end-of-day for endDate comparisons.
 */
export function getSalaryPeriodDates(
  referenceDate: Date,
  config: SalaryConfig,
): { startDate: Date; endDate: Date } {
  const { fromDay, toDay } = config
  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth()

  if (fromDay <= toDay) {
    // Same-month period (e.g. 1→31)
    return {
      startDate: safeDate(year, month, fromDay),
      endDate: safeDate(year, month, toDay),
    }
  }

  // Cross-month period (e.g. 26→25)
  if (referenceDate.getDate() >= fromDay) {
    // We're in the start-of-period month
    const start = safeDate(year, month, fromDay)
    const nextMonth = month === 11 ? 0 : month + 1
    const nextYear = month === 11 ? year + 1 : year
    const end = safeDate(nextYear, nextMonth, toDay)
    return { startDate: start, endDate: end }
  }

  // We're in the end-of-period month (day < fromDay)
  const prevMonth = month === 0 ? 11 : month - 1
  const prevYear = month === 0 ? year - 1 : year
  const start = safeDate(prevYear, prevMonth, fromDay)
  const end = safeDate(year, month, toDay)
  return { startDate: start, endDate: end }
}

/** Format a Date as DD/MM string */
export function formatDDMM(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}`
}

/** Get the day before a date */
export function dayBefore(date: Date): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - 1)
  return d
}

/** Get the day after a date */
export function dayAfter(date: Date): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + 1)
  return d
}

/** Convert a Date to ISO date string (YYYY-MM-DD) for API calls.
 * Uses local date components to avoid UTC-offset off-by-one errors. */
export function toISODate(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/** Shift an ISO date string (YYYY-MM-DD) by N days using local timezone.
 * Avoids UTC offset bugs in GMT+7 where toISOString() would return the wrong day. */
export function shiftISODate(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

/** Format an ISO date string (YYYY-MM-DD) as DD/MM/YYYY for display.
 * Pure string manipulation — no timezone risk. */
export function formatISODate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/**
 * Returns the (startDate, endDate) of the salary period for a given calendar month and year.
 * e.g. For month=5 (May) and config={fromDay: 21, toDay: 20}, returns 21/04 -> 20/05.
 */
export function getSalaryPeriodForMonth(
  year: number,
  month: number, // 1-indexed (1-12)
  config: SalaryConfig,
): { startDate: Date; endDate: Date } {
  const { fromDay, toDay } = config

  if (fromDay <= toDay) {
    // Same-month period (e.g. 1→31)
    return {
      startDate: safeDate(year, month - 1, fromDay),
      endDate: safeDate(year, month - 1, toDay),
    }
  }

  // Cross-month period (e.g. 21→20)
  // Starts in previous month (month - 2 in 0-indexed)
  const prevMonth = month === 1 ? 11 : month - 2
  const prevYear = month === 1 ? year - 1 : year
  return {
    startDate: safeDate(prevYear, prevMonth, fromDay),
    endDate: safeDate(year, month - 1, toDay),
  }
}
