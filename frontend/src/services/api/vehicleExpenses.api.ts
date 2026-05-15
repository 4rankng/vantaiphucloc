/**
 * Vehicle Expense (CP Xe) API.
 *
 * Categories:
 *   XANG_DAU — Fuel
 *   SUA_CHUA — Repairs / maintenance
 *   CHUNG    — General overhead (not tied to a specific vehicle)
 */

import { api } from './client'
import { toCamel, ok, fail } from './utils'
import type { ApiResponse } from '@/data/domain'

export type VehicleExpenseCategory = 'XANG_DAU' | 'SUA_CHUA' | 'CHUNG'

export const EXPENSE_CATEGORY_LABELS: Record<VehicleExpenseCategory, string> = {
  XANG_DAU: 'Xăng dầu',
  SUA_CHUA: 'Sửa chữa',
  CHUNG: 'Chi phí chung',
}

export interface VehicleExpense {
  id: number
  vehicleId: number | null
  vehiclePlate: string | null
  category: VehicleExpenseCategory
  amount: number
  expenseDate: string
  description: string | null
  receiptUrl: string | null
  createdBy: number | null
  createdAt: string
  updatedAt: string
}

export interface VehicleExpenseCreate {
  vehicleId?: number | null
  category: VehicleExpenseCategory
  amount: number
  expenseDate: string
  description?: string | null
  receiptUrl?: string | null
}

export interface VehicleExpensePage {
  items: VehicleExpense[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export async function listVehicleExpenses(params?: {
  vehicleId?: number
  category?: VehicleExpenseCategory
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}): Promise<ApiResponse<VehicleExpensePage>> {
  try {
    const res = await api.get('/vehicle-expenses', {
      params: {
        vehicle_id: params?.vehicleId,
        category: params?.category,
        date_from: params?.dateFrom,
        date_to: params?.dateTo,
        page: params?.page ?? 1,
        page_size: params?.pageSize ?? 50,
      },
    })
    return ok(toCamel<VehicleExpensePage>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function createVehicleExpense(
  body: VehicleExpenseCreate,
): Promise<ApiResponse<VehicleExpense>> {
  try {
    const res = await api.post('/vehicle-expenses', {
      vehicle_id: body.vehicleId ?? null,
      category: body.category,
      amount: body.amount,
      expense_date: body.expenseDate,
      description: body.description ?? null,
      receipt_url: body.receiptUrl ?? null,
    })
    return ok(toCamel<VehicleExpense>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function updateVehicleExpense(
  id: number,
  body: Partial<VehicleExpenseCreate>,
): Promise<ApiResponse<VehicleExpense>> {
  try {
    const res = await api.put(`/vehicle-expenses/${id}`, {
      vehicle_id: body.vehicleId,
      category: body.category,
      amount: body.amount,
      expense_date: body.expenseDate,
      description: body.description,
      receipt_url: body.receiptUrl,
    })
    return ok(toCamel<VehicleExpense>(res.data))
  } catch (err) {
    return fail(err)
  }
}

export async function deleteVehicleExpense(id: number): Promise<ApiResponse<void>> {
  try {
    await api.delete(`/vehicle-expenses/${id}`)
    return ok(undefined)
  } catch (err) {
    return fail(err)
  }
}
