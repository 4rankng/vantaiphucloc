import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSalaryConfig } from '@/hooks/use-queries'
import { getSalaryPeriodForMonth, getSalaryPeriodDates, toISODate } from '@/utils/salaryPeriod'

export function useMonthParams() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: config } = useSalaryConfig()

  const now = useMemo(() => new Date(), [])

  // Derive the default month from which salary period TODAY falls in.
  // e.g. today=May 30, fromDay=26, toDay=25 → period is May 26→Jun 25 → default month = June (6)
  const todayPeriod = useMemo(() => {
    const fromDay = config?.fromDay ?? 26
    const toDay = config?.toDay ?? 25
    return getSalaryPeriodDates(now, { fromDay, toDay })
  }, [now, config])

  const defaultMonth = todayPeriod.endDate.getMonth() + 1
  const defaultYear = todayPeriod.endDate.getFullYear()

  const month = Number(searchParams.get('month')) || defaultMonth
  const year = Number(searchParams.get('year')) || defaultYear

  const period = useMemo(() => {
    const fromDay = config?.fromDay ?? 26
    const toDay = config?.toDay ?? 25
    return getSalaryPeriodForMonth(year, month, { fromDay, toDay })
  }, [year, month, config])

  const dateFrom = toISODate(period.startDate)
  const dateTo = toISODate(period.endDate)

  const onPrev = useCallback(() => {
    setSearchParams(prev => {
      const m = Number(prev.get('month')) || defaultMonth
      const y = Number(prev.get('year')) || defaultYear
      if (m === 1) {
        prev.set('month', '12')
        prev.set('year', String(y - 1))
      } else {
        prev.set('month', String(m - 1))
        prev.set('year', String(y))
      }
      return prev
    })
  }, [setSearchParams, defaultMonth, defaultYear])

  const onNext = useCallback(() => {
    setSearchParams(prev => {
      const m = Number(prev.get('month')) || defaultMonth
      const y = Number(prev.get('year')) || defaultYear
      if (m === 12) {
        prev.set('month', '1')
        prev.set('year', String(y + 1))
      } else {
        prev.set('month', String(m + 1))
        prev.set('year', String(y))
      }
      return prev
    })
  }, [setSearchParams, defaultMonth, defaultYear])

  const sublabel = `${dateFrom.slice(8)}/${dateFrom.slice(5, 7)} → ${dateTo.slice(8)}/${dateTo.slice(5, 7)}`

  return {
    year,
    month,
    dateFrom,
    dateTo,
    periodStart: period.startDate,
    periodEnd: period.endDate,
    sublabel,
    onPrev,
    onNext,
  }
}
