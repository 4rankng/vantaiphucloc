/**
 * State + derivations for the RevenueProfit page.
 *
 * Resolves the current accounting period from `useSalaryConfig`, then
 * queries the P&L endpoint. The .tsx page only consumes the result.
 */

import { useMemo } from 'react'
import { useSalaryConfig, useMonthlyPnL, useVehiclePnL } from '@/hooks/use-queries'
import { getSalaryPeriodDates, toISODate } from '@/utils/salaryPeriod'

export function useRevenueProfit() {
  const { data: config } = useSalaryConfig()

  const { startDate, endDate } = useMemo(() => {
    const now = new Date()
    const fromDay = config?.fromDay ?? 26
    const toDay = config?.toDay ?? 25
    const period = getSalaryPeriodDates(now, { fromDay, toDay })
    return {
      startDate: toISODate(period.startDate),
      endDate: toISODate(period.endDate),
    }
  }, [config])

  const query = useMonthlyPnL(startDate, endDate)
  const vehicleQuery = useVehiclePnL(startDate, endDate)

  return {
    startDate,
    endDate,
    pnl: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    vehiclePnL: vehicleQuery.data ?? null,
    isVehiclePnLLoading: vehicleQuery.isLoading,
  }
}
