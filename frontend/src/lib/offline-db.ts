import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'ttransport_offline'
const DB_VERSION = 1

export function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback for non-secure contexts (plain HTTP)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export interface QueuedAction {
  id: string
  timestamp: number
  endpoint: string
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  retries: number
}

export interface CachedData {
  key: string
  data: unknown
  fetchedAt: number
  expiresAt: number
}

let dbInstance: IDBPDatabase | null = null

async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Offline mutation queue
      if (!db.objectStoreNames.contains('queue')) {
        const store = db.createObjectStore('queue', { keyPath: 'id' })
        store.createIndex('timestamp', 'timestamp')
        store.createIndex('endpoint', 'endpoint')
      }
      // API response cache
      if (!db.objectStoreNames.contains('cache')) {
        const store = db.createObjectStore('cache', { keyPath: 'key' })
        store.createIndex('expiresAt', 'expiresAt')
      }
      // Pending uploads (photos, documents)
      if (!db.objectStoreNames.contains('uploads')) {
        const store = db.createObjectStore('uploads', { keyPath: 'id' })
        store.createIndex('status', 'status')
      }
    },
  })
  return dbInstance
}

// ─── Queue Operations ─────────────────────────────

export async function enqueue(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retries'>): Promise<QueuedAction> {
  const db = await getDB()
  const entry: QueuedAction = {
    ...action,
    id: uuid(),
    timestamp: Date.now(),
    retries: 0,
  }
  try {
    await db.put('queue', entry)
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      await cleanupOrphanUploads(0)
      await clearExpiredCache()
      await db.put('queue', entry)
    } else {
      throw e
    }
  }
  return entry
}

export async function getQueue(): Promise<QueuedAction[]> {
  const db = await getDB()
  return db.getAll('queue')
}

export async function getQueueCount(): Promise<number> {
  const db = await getDB()
  return db.count('queue')
}

export async function removeFromQueue(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('queue', id)
}

export async function incrementRetry(id: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('queue', 'readwrite')
  const entry = await tx.store.get(id)
  if (entry) {
    entry.retries++
    await tx.store.put(entry)
  }
  await tx.done
}

export async function clearQueue(): Promise<void> {
  const db = await getDB()
  await db.clear('queue')
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

// ─── Upload Operations ─────────────────────────────

export interface PendingUpload {
  id: string
  tripId: string
  type: 'container_photo' | 'document' | 'signature'
  blob: Blob
  filename: string
  status: 'pending' | 'uploading' | 'failed'
  retries: number
  createdAt: number
}

export async function addUpload(upload: Omit<PendingUpload, 'id' | 'status' | 'retries' | 'createdAt'>): Promise<PendingUpload> {
  const db = await getDB()
  const entry: PendingUpload = {
    ...upload,
    id: uuid(),
    status: 'pending',
    retries: 0,
    createdAt: Date.now(),
  }
  try {
    await db.put('uploads', entry)
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      await cleanupOrphanUploads(0)
      await db.put('uploads', entry)
    } else {
      throw e
    }
  }
  return entry
}

export async function getPendingUploads(): Promise<PendingUpload[]> {
  const db = await getDB()
  const all = await db.getAll('uploads')
  return all.filter(u => u.status === 'pending' || u.status === 'failed')
}

export async function updateUploadStatus(id: string, status: PendingUpload['status']): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('uploads', 'readwrite')
  const entry = await tx.store.get(id)
  if (entry) {
    entry.status = status
    if (status === 'failed') entry.retries++
    await tx.store.put(entry)
  }
  await tx.done
}

export async function removeUpload(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('uploads', id)
}

// ─── Sync Engine ───────────────────────────────────

const MAX_RETRIES = 5

export async function syncQueue(): Promise<{ synced: number; failed: number }> {
  const queue = await getQueue()
  let synced = 0
  let failed = 0

  for (const action of queue) {
    if (action.retries >= MAX_RETRIES) {
      await removeFromQueue(action.id)
      failed++
      continue
    }

    try {
      const r = await fetch(action.endpoint, {
        method: action.method,
        headers: { 'Content-Type': 'application/json' },
        body: action.body ? JSON.stringify(action.body) : undefined,
      })

      if (r.ok) {
        await removeFromQueue(action.id)
        synced++
      } else if (r.status >= 400 && r.status < 500) {
        // Client error — don't retry
        await removeFromQueue(action.id)
        failed++
      } else {
        // Server error — retry later
        await incrementRetry(action.id)
        failed++
      }
    } catch {
      await incrementRetry(action.id)
      failed++
    }
  }

  return { synced, failed }
}

export async function syncUploads(): Promise<{ synced: number; failed: number }> {
  const uploads = await getPendingUploads()
  let synced = 0
  let failed = 0

  for (const upload of uploads) {
    if (upload.retries >= MAX_RETRIES) {
      await removeUpload(upload.id)
      failed++
      continue
    }

    try {
      await updateUploadStatus(upload.id, 'uploading')
      const form = new FormData()
      form.append('file', upload.blob, upload.filename)
      form.append('type', upload.type)
      form.append('tripId', upload.tripId)

      const r = await fetch('/api/v1/uploads', { method: 'POST', body: form })
      if (r.ok) {
        await removeUpload(upload.id)
        synced++
      } else {
        await updateUploadStatus(upload.id, 'failed')
        failed++
      }
    } catch {
      await updateUploadStatus(upload.id, 'failed')
      failed++
    }
  }

  return { synced, failed }
}

// ─── Cleanup ────────────────────────────────────────

/** Remove uploads older than maxAgeMs whose queue entry no longer exists. */
export async function cleanupOrphanUploads(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<number> {
  const db = await getDB()
  const cutoff = Date.now() - maxAgeMs
  const queue = await getQueue()
  const activeTripIds = new Set(queue.map(a => (a.body as Record<string, unknown>)?.tripId as string | undefined).filter(Boolean))

  const tx = db.transaction('uploads', 'readwrite')
  let cursor = await tx.store.openCursor()
  let removed = 0
  while (cursor) {
    const u = cursor.value as PendingUpload
    if (u.createdAt < cutoff && !activeTripIds.has(u.tripId)) {
      await cursor.delete()
      removed++
    }
    cursor = await cursor.continue()
  }
  await tx.done
  return removed
}
