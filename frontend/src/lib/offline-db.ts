import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'ttransport_offline'
const DB_VERSION = 1

let dbInstance: IDBPDatabase | null = null

async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // API response cache
      if (!db.objectStoreNames.contains('cache')) {
        const store = db.createObjectStore('cache', { keyPath: 'key' })
        store.createIndex('expiresAt', 'expiresAt')
      }
    },
  })
  return dbInstance
}

// ─── Cache Operations ─────────────────────────────

export async function setCache(key: string, data: unknown, ttlMs: number = 30 * 60 * 1000): Promise<void> {
  const db = await getDB()
  await db.put('cache', {
    key,
    data,
    fetchedAt: Date.now(),
    expiresAt: Date.now() + ttlMs,
  })
}

export async function getCache<T = unknown>(key: string): Promise<T | null> {
  const db = await getDB()
  const entry = await db.get('cache', key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    await db.delete('cache', key)
    return null
  }
  return entry.data as T
}

export async function clearExpiredCache(): Promise<number> {
  const db = await getDB()
  const tx = db.transaction('cache', 'readwrite')
  const now = Date.now()
  let cleared = 0
  let cursor = await tx.store.openCursor()
  while (cursor) {
    if (cursor.value.expiresAt < now) {
      await cursor.delete()
      cleared++
    }
    cursor = await cursor.continue()
  }
  await tx.done
  return cleared
}

export async function clearAllCache(): Promise<void> {
  const db = await getDB()
  await db.clear('cache')
}
