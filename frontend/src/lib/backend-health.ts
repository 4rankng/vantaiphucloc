/**
 * One-shot backend reachability probe.
 *
 * Returns true only when GET /health responds with a valid body — this rejects
 * captive portals that answer 200 with HTML. Used as a pre-submit gate so the
 * driver gets an honest "no connection" error immediately, instead of waiting
 * for each trip POST to time out.
 *
 * Deliberately standalone: no online/offline listeners, no polling, no UI. The
 * always-on health monitor + offline pill were removed; this is a single probe
 * fired only at submit time.
 */
const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1'
const HEALTH_TIMEOUT = 3000 // interactive pre-submit gate: fail fast

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), HEALTH_TIMEOUT)
    const r = await fetch(`${API_BASE}/health`, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(id)
    if (!r.ok) return false
    const body = await r.json()
    return body?.status === 'ok'
  } catch {
    return false
  }
}
