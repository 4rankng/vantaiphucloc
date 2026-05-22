/**
 * Shared utilities for API modules.
 *
 * Key conventions:
 *  - toCamel  : recursively converts snake_case keys → camelCase on all responses
 *  - toSnake  : converts camelCase keys → snake_case for request bodies
 *  - All calls are wrapped in try/catch; failures return
 *    { data: null, success: false, message: error.message }
 */

import { api } from './client'
import type { ApiResponse, PaginatedResult } from '@/data/domain'

// ─── Case-conversion utilities ────────────────────────────────────────────────

export function isNetworkError(err: unknown): boolean {
  if (err && typeof err === 'object' && 'type' in err) {
    return (err as { type: string }).type === 'network'
  }
  if (err instanceof Error) {
    return err.message.includes('Network Error') || err.message.includes('timeout')
  }
  return !navigator.onLine
}

/** Convert a single snake_case string to camelCase */
function snakeToCamel(s: string): string {
  return s.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase())
}

/** Convert a single camelCase string to snake_case */
function camelToSnake(s: string): string {
  return s.replace(/([A-Z])/g, (c: string) => '_' + c.toLowerCase()).replace(/([a-z])([0-9])/g, '$1_$2')
}

/** Recursively convert all object keys from snake_case to camelCase */
export function toCamel<T>(value: unknown): T {
  if (Array.isArray(value)) {
    return value.map(v => toCamel<unknown>(v)) as T
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[snakeToCamel(k)] = toCamel(v)
    }
    return result as T
  }
  return value as T
}

/** Recursively convert all object keys from camelCase to snake_case */
export function toSnake(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(toSnake)
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[camelToSnake(k)] = toSnake(v)
    }
    return result
  }
  return value
}

/** Unwrap paginated response { items: T[] } or pass through if already an array */
export function unwrapList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  if (data !== null && typeof data === 'object' && 'items' in (data as object)) {
    return (data as { items: unknown[] }).items
  }
  return data as unknown[]
}

/** Unwrap backend PaginatedResponse into frontend PaginatedResult */
export function unwrapPaginated<T>(data: unknown, mapItem: (raw: unknown) => T): PaginatedResult<T> {
  const d = data as Record<string, unknown>
  const rawItems: unknown[] = Array.isArray(d?.items) ? d.items : []
  return {
    items: rawItems.map(mapItem),
    total: (d?.total as number) ?? rawItems.length,
    page: (d?.page as number) ?? 1,
    pageSize: (d?.page_size as number) ?? 50,
    totalPages: (d?.total_pages as number) ?? 1,
  }
}

/** Wrap a successful result in the ApiResponse shape */
export function ok<T>(data: T): ApiResponse<T> {
  return { data, success: true }
}

/** Wrap an error in the ApiResponse shape */
export function fail<T>(err: unknown): ApiResponse<T> {
  const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi'
  return { data: null as unknown as T, success: false, message }
}

/** Re-export the axios instance for convenience */
export { api }
