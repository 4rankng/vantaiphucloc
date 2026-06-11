import { api } from './client'
import { safeRequest, toCamel } from '@/lib/safe-request'
import type { ApiResponse } from '@/data/domain'

export type VehicleExpenseCategory = 'XANG_DAU' | 'SUA_CHUA' | 'TIEN_LUAT' | 'KHAC'

export const EXPENSE_CATEGORY_LABELS: Record<VehicleExpenseCategory, string> = {
  XANG_DAU: 'Xăng dầu',
  SUA_CHUA: 'Sửa chữa',
  TIEN_LUAT: 'Tiền luật',
  KHAC: 'Khác',
}

export interface VehicleExpense {
  id: number
  vehicleId: number
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
  vehicleId: number
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

export function listVehicleExpenses(params?: {
  vehicleId?: number
  category?: VehicleExpenseCategory
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}): Promise<ApiResponse<VehicleExpensePage>> {
  return safeRequest(() => api.get('/vehicle-expenses', {
    params: {
      vehicle_id: params?.vehicleId,
      category: params?.category,
      date_from: params?.dateFrom,
      date_to: params?.dateTo,
      page: params?.page ?? 1,
      page_size: params?.pageSize ?? 50,
    },
  }))
}

export function createVehicleExpense(
  body: VehicleExpenseCreate,
): Promise<ApiResponse<VehicleExpense>> {
  return safeRequest(() => api.post('/vehicle-expenses', {
    vehicle_id: body.vehicleId ?? null,
    category: body.category,
    amount: body.amount,
    expense_date: body.expenseDate,
    description: body.description ?? null,
    receipt_url: body.receiptUrl ?? null,
  }))
}

export function updateVehicleExpense(
  id: number,
  body: Partial<VehicleExpenseCreate>,
): Promise<ApiResponse<VehicleExpense>> {
  return safeRequest(() => api.put(`/vehicle-expenses/${id}`, {
    vehicle_id: body.vehicleId,
    category: body.category,
    amount: body.amount,
    expense_date: body.expenseDate,
    description: body.description,
    receipt_url: body.receiptUrl,
  }))
}

export function deleteVehicleExpense(id: number): Promise<ApiResponse<void>> {
  return safeRequest(() => api.delete(`/vehicle-expenses/${id}`), () => undefined)
}
