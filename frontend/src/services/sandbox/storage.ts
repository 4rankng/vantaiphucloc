const PREFIX = 'ttransport_'

export function getStore<T>(key: string, fallback: T[]): T[] {
  const raw = localStorage.getItem(PREFIX + key)
  if (raw) {
    try { return JSON.parse(raw) as T[] }
    catch { /* corrupt data — re-seed */ }
  }
  setStore(key, fallback)
  return fallback
}

export function setStore<T>(key: string, data: T[]): void {
  localStorage.setItem(PREFIX + key, JSON.stringify(data))
}

export function generateId(prefix: string): string {
  const seq = Math.floor(Math.random() * 900000) + 100000
  return `${prefix}-${seq}`
}

export function delay(ms = 250): Promise<void> {
  return new Promise(r => setTimeout(r, ms + Math.random() * 200))
}
