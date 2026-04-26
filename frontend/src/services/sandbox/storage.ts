const PREFIX = 'ttransport_'
const VERSION = 2

export function getStore<T>(key: string, fallback: T[]): T[] {
  const raw = localStorage.getItem(PREFIX + key)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      // If data is stale (old format), re-seed with fallback
      if (Array.isArray(parsed) && parsed.length > 0) {
        const version = localStorage.getItem(PREFIX + '_version')
        if (version !== String(VERSION)) {
          // Version mismatch — re-seed all stores
          setStore(key, fallback)
          return fallback
        }
      }
      return parsed as T[]
    } catch { /* corrupt data — re-seed */ }
  }
  setStore(key, fallback)
  return fallback
}

export function setStore<T>(key: string, data: T[]): void {
  // Ensure version marker exists
  if (!localStorage.getItem(PREFIX + '_version')) {
    localStorage.setItem(PREFIX + '_version', String(VERSION))
  }
  localStorage.setItem(PREFIX + key, JSON.stringify(data))
}

export function resetAllStores(): void {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(PREFIX))
  keys.forEach(k => localStorage.removeItem(k))
  localStorage.setItem(PREFIX + '_version', String(VERSION))
}

export function generateId(prefix: string): string {
  const seq = Math.floor(Math.random() * 900000) + 100000
  return `${prefix}-${seq}`
}

export function delay(ms = 250): Promise<void> {
  return new Promise(r => setTimeout(r, ms + Math.random() * 200))
}
