/**
 * Version check utility for PWA force-update.
 *
 * The backend exposes GET /api/v1/version with { version, minimum_version }.
 * The frontend's build version is injected via Vite's define plugin.
 */

declare const __APP_VERSION__: string

const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1'

export type VersionStatus = 'up-to-date' | 'soft-update' | 'hard-update'

function parseVersion(v: string): number[] {
  return v.split('.').map(Number)
}

function semverLt(a: string, b: string): boolean {
  const pa = parseVersion(a)
  const pb = parseVersion(b)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const na = pa[i] ?? 0
    const nb = pb[i] ?? 0
    if (na < nb) return true
    if (na > nb) return false
  }
  return false
}

export function getCurrentVersion(): string {
  return __APP_VERSION__
}

export async function checkVersion(): Promise<VersionStatus> {
  try {
    const res = await fetch(`${API_BASE}/version`)
    if (!res.ok) return 'up-to-date'
    const { version, minimum_version } = await res.json()

    const current = getCurrentVersion()

    if (semverLt(current, minimum_version)) return 'hard-update'
    if (semverLt(current, version)) return 'soft-update'
    return 'up-to-date'
  } catch {
    // Network error — don't block the app
    return 'up-to-date'
  }
}
