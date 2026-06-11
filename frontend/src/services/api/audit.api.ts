import { api } from './client'
import { toCamel } from '@/lib/safe-request'

export interface AuditLogEntry {
  id: number
  userId: number | null
  userName: string | null
  userRole: string | null
  action: string
  tableName: string
  recordId: number
  oldValue: string | null
  newValue: string | null
  reason: string | null
  createdAt: string
  subjectName: string | null
}

export async function getAuditLogs(params?: {
  page?: number;
  pageSize?: number;
  action?: string;
  isFinancial?: boolean;
  createdAfter?: string;
}): Promise<{ items: AuditLogEntry[]; total: number }> {
  const res = await api.get('/audit-logs', {
    params: {
      page: params?.page ?? 1,
      page_size: params?.pageSize ?? 10,
      action: params?.action,
      is_financial: params?.isFinancial,
      created_after: params?.createdAfter,
    }
  })
  return toCamel<{ items: AuditLogEntry[]; total: number }>(res.data)
}
