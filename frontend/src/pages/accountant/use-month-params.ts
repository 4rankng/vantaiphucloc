import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { pad, daysInMonth } from '@/lib/date-utils'

export function useMonthParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  const now = useMemo(() => new Date(), [])
  const defaultMonth = now.getMonth() + 1
  const defaultYear = now.getFullYear()

  const month = Number(searchParams.get('month')) || defaultMonth
  const year = Number(searchParams.get('year')) || defaultYear

  const dateFrom = `${year}-${pad(month)}-01`
  const dateTo = `${year}-${pad(month)}-${pad(daysInMonth(year, month))}`

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

  return { year, month, dateFrom, dateTo, sublabel, onPrev, onNext }
}
