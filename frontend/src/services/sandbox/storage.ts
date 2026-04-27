const PREFIX = 'ttransport_'
const VERSION = 8

export function getStore<T>(key: string, fallback: T[]): T[] {
  const version = localStorage.getItem(PREFIX + '_version')
  if (version !== String(VERSION)) {
    resetAllStores()
  }

  const raw = localStorage.getItem(PREFIX + key)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as T[]
    } catch { /* corrupt */ }
  }
  setStore(key, fallback)
  return fallback
}

export function setStore<T>(key: string, data: T[]): void {
  localStorage.setItem(PREFIX + key, JSON.stringify(data))
  localStorage.setItem(PREFIX + '_version', String(VERSION))
}

export function resetAllStores(): void {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(PREFIX))
  keys.forEach(k => localStorage.removeItem(k))
}

export function generateId(prefix: string): string {
  const seq = Math.floor(Math.random() * 900000) + 100000
  return `${prefix}-${seq}`
}

export function delay(ms = 250): Promise<void> {
  return new Promise(r => setTimeout(r, ms + Math.random() * 200))
}
