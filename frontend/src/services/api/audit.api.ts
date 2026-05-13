import { api } from './client'
import { toCamel } from './utils'

export interface AuditLogEntry {
  id: number
  userId: number | null
  action: string
  tableName: string
  recordId: number
  oldValue: string | null
  newValue: string | null
  reason: string | null
  createdAt: string
}

export async function getAuditLogs(params?: { pageSize?: number; action?: string }): Promise<{ items: AuditLogEntry[]; total: number }> {
  const res = await api.get('/audit-logs', { params: { page_size: params?.pageSize ?? 10, action: params?.action } })
  const data = toCamel<{ items: AuditLogEntry[]; total: number }>(res.data)
  return data
}
