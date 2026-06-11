import type { VehicleExpense, VehicleExpenseCategory } from '@/services/api/vehicleExpenses.api'

/** Expense categories in display order. */
export const EXPENSE_CATEGORIES: VehicleExpenseCategory[] = ['XANG_DAU', 'SUA_CHUA', 'TIEN_LUAT', 'KHAC']

/** Category → pill variant mapping for display. */
export const CATEGORY_VARIANT: Record<VehicleExpenseCategory, 'accent' | 'warn' | 'info' | 'neutral'> = {
  XANG_DAU: 'accent',
  SUA_CHUA: 'warn',
  TIEN_LUAT: 'info',
  KHAC: 'neutral',
}

/** Audit entry derived from raw VehicleExpense — tracks edit state. */
export interface AuditEntry {
  expense: VehicleExpense
  addedDate: string
  edited: boolean
}

/** Convert an ISO datetime string to a local YYYY-MM-DD date string. */
export function toLocalISODate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso.slice(0, 10)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
