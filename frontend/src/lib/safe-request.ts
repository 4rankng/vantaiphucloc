/**
 * `safeRequest` — eliminates the repetitive try/catch + ok/fail boilerplate
 * found in every API module.
 *
 * Before (repeated ~100+ times):
 *   try {
 *     const res = await api.get('/x')
 *     return ok(toCamel(res.data))
 *   } catch (err) {
 *     return fail(err)
 *   }
 *
 * After:
 *   return safeRequest(() => api.get('/x'))
 */

import type { AxiosResponse } from 'axios'
import type { ApiResponse } from '@/data/domain'
import { ok, fail, toCamel, toSnake } from '@/services/api/utils'

// Re-export so modules can import from a single location
export { ok, fail, toCamel, toSnake }

type RequestFn = () => Promise<AxiosResponse<unknown>>

/**
 * Execute an Axios request inside a try/catch, wrapping the result
 * in an ApiResponse<T>.
 *
 * @param req   - A zero-arg function that returns the Axios promise.
 * @param map   - Optional transform applied to `res.data` on success.
 *                Receives the raw AxiosResponse so callers can inspect
 *                headers / status if needed.  Defaults to `ok(toCamel(data))`.
 */
export function safeRequest<T>(
  req: RequestFn,
  map?: (res: AxiosResponse<unknown>) => T,
): Promise<ApiResponse<T>> {
  return req()
    .then((res) => ok<T>(map ? map(res) : (toCamel(res.data) as T)))
    .catch((err: unknown) => fail<T>(err))
}
