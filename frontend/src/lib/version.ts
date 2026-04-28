/**
 * Version checking for backend-driven force updates.
 *
 * The frontend bakes its own version at build time (__APP_VERSION__).
 * On load + every 5 minutes, it calls GET /api/v1/version (public, no auth)
 * to compare against the backend's APP_VERSION and MINIMUM_VERSION.
 *
 * - hard-update: frontend version < MINIMUM_VERSION → nuke caches, reload
 * - soft-update: frontend version < APP_VERSION   → tell SW to skipWaiting
 */

declare const __APP_VERSION__: string

export const CURRENT_VERSION: string = typeof __APP_VERSION__ !== 'undefined'
  ? __APP_VERSION__
  : '0.0.0.0'

export type VersionStatus = 'up-to-date' | 'soft-update' | 'hard-update'

interface VersionResponse {
  version: string
  minimum_version: string
}

/**
 * Compare two date-based version strings like "2026.04.28.1" vs "2026.04.22.0".
 * Returns negative if a < b, 0 if equal, positive if a > b.
 */
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const na = pa[i] ?? 0
    const nb = pb[i] ?? 0
    if (na !== nb) return na - nb
  }
  return 0
}

/**
 * Call the backend version endpoint and determine update status.
 * Works without authentication.
 */
export async function checkVersion(): Promise<VersionStatus> {
  try {
    const res = await fetch('/api/v1/version')
    if (!res.ok) return 'up-to-date'

    const data: VersionResponse = await res.json()

    if (compareVersions(CURRENT_VERSION, data.minimum_version) < 0) {
      return 'hard-update'
    }
    if (compareVersions(CURRENT_VERSION, data.version) < 0) {
      return 'soft-update'
    }
    return 'up-to-date'
  } catch {
    // Network error — can't check, assume up-to-date
    return 'up-to-date'
  }
}

/**
 * Force-delete all caches and reload the page.
 */
export async function forceUpdate(): Promise<void> {
  if ('caches' in window) {
    const names = await caches.keys()
    await Promise.all(names.map(n => caches.delete(n)))
  }

  // Tell service worker to stop
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'FORCE_UPDATE' })
  }

  // Small delay so SW can process the message
  await new Promise(r => setTimeout(r, 800))
  location.reload()
}

/**
 * Tell service worker to activate the waiting version immediately.
 */
export function requestSoftUpdate(): void {
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' })
  }
}
