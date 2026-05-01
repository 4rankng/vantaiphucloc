/**
 * Network status detection — pure logic, no React.
 *
 * Tracks two dimensions of connectivity:
 *   browserOnline  – navigator.onLine (device has internet)
 *   backendOnline  – GET /api/v1/health responds with valid body
 *
 * The app is considered "offline" if either is false.
 */

const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1'
const HEALTH_TIMEOUT = 8000   // increased: cold droplet can be slow
const POLL_INTERVAL = 30_000
const INITIAL_RETRY_DELAY = 3000  // retry once after 3s on initial load failure

let _backendOnline = true
let _pollTimer: ReturnType<typeof setInterval> | null = null
const _listeners = new Set<(backendOnline: boolean) => void>()

// ── Backend health check ──────────────────────────────────────────────

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
    // Validate response body to reject captive portals returning 200 HTML
    const body = await r.json()
    return body?.status === 'ok'
  } catch {
    return false
  }
}

// ── State accessors ───────────────────────────────────────────────────

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

export function isBackendOnline(): boolean {
  return _backendOnline
}

/** True only when both browser and backend are reachable. */
export function isFullyOnline(): boolean {
  return isOnline() && _backendOnline
}

// ── Listener management ───────────────────────────────────────────────

export function onNetworkChange(callback: (online: boolean) => void): () => void {
  const goOnline = () => {
    checkBackendHealth().then(ok => {
      setBackendOnline(ok)
      callback(ok)
    })
  }
  const goOffline = () => {
    setBackendOnline(false)
    callback(false)
  }

  window.addEventListener('online', goOnline)
  window.addEventListener('offline', goOffline)
  _listeners.add(callback)

  return () => {
    window.removeEventListener('online', goOnline)
    window.removeEventListener('offline', goOffline)
    _listeners.delete(callback)
  }
}

export function onBackendStatusChange(
  callback: (backendOnline: boolean) => void,
): () => void {
  _listeners.add(callback)
  return () => { _listeners.delete(callback) }
}

// ── Internal ──────────────────────────────────────────────────────────

function setBackendOnline(value: boolean) {
  const changed = _backendOnline !== value
  _backendOnline = value
  if (changed) {
    _listeners.forEach(fn => fn(value))
    updatePolling()
  }
}

function updatePolling() {
  if (isOnline() && !_backendOnline) {
    startPolling()
  } else {
    stopPolling()
  }
}

function startPolling() {
  if (_pollTimer) return
  _pollTimer = setInterval(async () => {
    if (!isOnline()) return
    // Skip health check when tab is hidden to save battery
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
    const ok = await checkBackendHealth()
    setBackendOnline(ok)
  }, POLL_INTERVAL)
}

function stopPolling() {
  if (_pollTimer) {
    clearInterval(_pollTimer)
    _pollTimer = null
  }
}

// ── Auto-init on import ───────────────────────────────────────────────

if (typeof window !== 'undefined') {
  // Initial check — if it fails, retry once after a short delay
  // (handles slow cold-start on production servers)
  checkBackendHealth().then(ok => {
    if (ok) {
      setBackendOnline(true)
    } else {
      setTimeout(() => {
        checkBackendHealth().then(retryOk => setBackendOnline(retryOk))
      }, INITIAL_RETRY_DELAY)
    }
  })

  window.addEventListener('online', () => {
    checkBackendHealth().then(ok => setBackendOnline(ok))
  })
  window.addEventListener('offline', () => {
    setBackendOnline(false)
  })

  // Resume health check when tab becomes visible
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isOnline() && !_backendOnline) {
      checkBackendHealth().then(ok => setBackendOnline(ok))
    }
  })
}
