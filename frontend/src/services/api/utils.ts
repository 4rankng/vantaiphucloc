/**
 * Shared utilities for API modules.
 *
 * Key conventions:
 *  - toCamel  : recursively converts snake_case keys → camelCase on all responses
 *  - toSnake  : converts camelCase keys → snake_case for request bodies
 *  - toStringId: converts integer `id` fields to strings so existing string-ID
 *                comparisons in page components continue to work
 *  - All calls are wrapped in try/catch; failures return
 *    { data: null, success: false, message: error.message }
 */

import { api } from './client'
import type { ApiResponse } from '@/data/domain'

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
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
}

/** Convert a single camelCase string to snake_case */
function camelToSnake(s: string): string {
  return s.replace(/([A-Z])/g, (c: string) => '_' + c.toLowerCase())
}

/** Recursively convert all object keys from snake_case to camelCase */
export function toCamel(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(toCamel)
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[snakeToCamel(k)] = toCamel(v)
    }
    return result
  }
  return value
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

/**
 * Convert integer `id` fields to strings in a camelCase-converted object.
 * The backend returns integer PKs; the frontend uses string IDs everywhere.
 */
export function toStringId<T extends Record<string, unknown>>(obj: T): T {
  if (obj && typeof obj.id === 'number') {
    return { ...obj, id: String(obj.id) }
  }
  return obj
}

/** Apply toCamel + toStringId to a single response object */
export function normalizeOne<T>(raw: unknown): T {
  const camel = toCamel(raw) as Record<string, unknown>
  return toStringId(camel) as T
}

/** Apply toCamel + toStringId to an array of response objects */
export function normalizeMany<T>(raw: unknown): T[] {
  return (toCamel(raw) as Record<string, unknown>[]).map(item => toStringId(item) as T)
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
