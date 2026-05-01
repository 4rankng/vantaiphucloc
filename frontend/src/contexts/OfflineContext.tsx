'use client'

import type { ReactNode } from 'react'
import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { isFullyOnline, onNetworkChange } from '@/lib/network'
import {
  syncQueue,
  syncUploads,
  getQueueCount,
  clearExpiredCache,
  cleanupOrphanUploads,
  getQueue,
  removeFromQueue,
  incrementRetry,
  type QueuedAction,
} from '@/lib/offline-db'

const BATCH_SIZE = 20
const SYNC_LOCK = 'ttransport-offline-sync'

interface SyncProgress {
  total: number
  synced: number
  failed: number
}

interface OfflineContextValue {
  isOnline: boolean
  pendingCount: number
  syncing: boolean
  syncProgress: SyncProgress | null
  queueAction: (action: { endpoint: string; method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown }) => Promise<void>
  clearQueue: () => Promise<void>
  syncNow: () => Promise<{ synced: number; failed: number }>
}

const OfflineContext = createContext<OfflineContextValue | null>(null)

// eslint-disable-next-line react-refresh/only-export-components
export function useOffline() {
  const ctx = useContext(OfflineContext)
  if (!ctx) throw new Error('useOffline must be used within OfflineProvider')
  return ctx
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

export function OfflineProvider({ children }: { children: ReactNode }) {
  // Start optimistically online — the health check will correct this if needed.
  // This prevents a false "offline" flash on page load before the first check completes.
  const [isOnline, setIsOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null)
  const prevOnlineRef = useRef(isOnline)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const unsub = onNetworkChange((online) => {
      setIsOnline(online)
    })
    return unsub
  }, [])

  useEffect(() => {
    getQueueCount().then(n => setPendingCount(n))
  }, [])

  // Abort in-flight sync on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  const queueAction = useCallback(async (action: { endpoint: string; method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown }) => {
    const { enqueue } = await import('@/lib/offline-db')
    await enqueue({ endpoint: action.endpoint, method: action.method, body: action.body })
    const count = await getQueueCount()
    setPendingCount(count)
  }, [])

  const clearQueue = useCallback(async () => {
    const { clearQueue: dbClear } = await import('@/lib/offline-db')
    await dbClear()
    setPendingCount(0)
  }, [])

  async function runSync(): Promise<{ synced: number; failed: number }> {
    // Guard against re-entrancy
    if (syncing) return { synced: 0, failed: 0 }

    const abort = new AbortController()
    abortRef.current = abort
    setSyncing(true)
    setSyncProgress({ total: 0, synced: 0, failed: 0 })

    try {
      const queue = await getQueue()
      if (abort.signal.aborted) return { synced: 0, failed: 0 }

      const workOrderPosts = queue.filter(a => a.endpoint === '/api/v1/work-orders' && a.method === 'POST')
      const otherActions = queue.filter(a => !(a.endpoint === '/api/v1/work-orders' && a.method === 'POST'))

      let totalSynced = 0
      let totalFailed = 0
      const totalItems = queue.length
      setSyncProgress({ total: totalItems, synced: 0, failed: 0 })

      // Phase 1: batch sync work-order POSTs in chunks
      for (let chunk = 0; chunk < workOrderPosts.length; chunk += BATCH_SIZE) {
        if (abort.signal.aborted) break
        const batch = workOrderPosts.slice(chunk, chunk + BATCH_SIZE)
        const result = await syncBatchChunk(batch, abort.signal)
        totalSynced += result.synced
        totalFailed += result.failed
        setSyncProgress({ total: totalItems, synced: totalSynced, failed: totalFailed })
      }

      // Phase 2: sync other actions individually (with auth + retry + 401 handling)
      if (otherActions.length > 0) {
        const otherResult = await syncQueue() // syncQueue already handles retries
        totalSynced += otherResult.synced
        totalFailed += otherResult.failed
        setSyncProgress({ total: totalItems, synced: totalSynced, failed: totalFailed })
      }

      // Phase 3: sync pending uploads
      const uploadResult = await syncUploads()
      totalSynced += uploadResult.synced
      totalFailed += uploadResult.failed

      // Phase 4: cleanup
      await clearExpiredCache()
      await cleanupOrphanUploads()

      const count = await getQueueCount()
      setPendingCount(count)

      return { synced: totalSynced, failed: totalFailed }
    } finally {
      setSyncing(false)
      setSyncProgress(null)
      abortRef.current = null
    }
  }

  const syncNow = useCallback(async (): Promise<{ synced: number; failed: number }> => {
    if (!isFullyOnline()) return { synced: 0, failed: 0 }

    // Critical #2: Use Web Locks API to prevent cross-tab duplicate sync
    if (typeof navigator !== 'undefined' && navigator.locks) {
      try {
        return await navigator.locks.request(SYNC_LOCK, { mode: 'exclusive', ifAvailable: true }, async (lock) => {
          if (!lock) return { synced: 0, failed: 0 }
          return runSync()
        })
      } catch {
        // Lock API not supported in some contexts, proceed without lock
        return runSync()
      }
    }
    return runSync()
  }, [])

  useEffect(() => {
    if (isOnline && !prevOnlineRef.current && pendingCount > 0 && !syncing) {
      const timer = setTimeout(() => {
        syncNow()
      }, 300)
      return () => clearTimeout(timer)
    }
    prevOnlineRef.current = isOnline
  }, [isOnline, pendingCount, syncing, syncNow])

  const value = useMemo(() => ({ isOnline, pendingCount, syncing, syncProgress, queueAction, clearQueue, syncNow }), [isOnline, pendingCount, syncing, syncProgress, queueAction, clearQueue, syncNow])

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  )
}

/** Sync a chunk of work-order POSTs via the batch endpoint. */
async function syncBatchChunk(
  actions: QueuedAction[],
  signal: AbortSignal,
): Promise<{ synced: number; failed: number }> {
  let synced = 0
  let failed = 0

  try {
    if (signal.aborted) return { synced: 0, failed: 0 }

    const res = await fetch('/api/v1/work-orders/batch', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ items: actions.map(a => a.body) }),
      signal,
    })

    // Critical #1: Handle 401 — token expired/invalid
    if (res.status === 401) {
      // Don't retry these items — let the user re-authenticate
      return { synced: 0, failed: actions.length }
    }

    if (res.ok || res.status === 207) {
      const results = await res.json() as Array<{ index: number; id: number; success: boolean; error?: string }>
      for (const r of results) {
        if (signal.aborted) break
        const action = actions[r.index]
        if (!action) continue
        if (r.success) {
          await removeFromQueue(action.id)
          synced++
        } else {
          // Client error on this item — increment retry, remove if exhausted
          const { incrementRetry, removeFromQueue: remove } = await import('@/lib/offline-db')
          if (action.retries >= 4) {
            await remove(action.id)
            failed++
          } else {
            await incrementRetry(action.id)
            failed++
          }
        }
      }
      return { synced, failed }
    }
  } catch {
    if (signal.aborted) return { synced: 0, failed: 0 }
    // Network error during batch — fall through to individual retry
  }

  // Fallback: replay individually
  for (const action of actions) {
    if (signal.aborted) break
    try {
      const r = await fetch(action.endpoint, {
        method: action.method,
        headers: getAuthHeaders(),
        body: action.body ? JSON.stringify(action.body) : undefined,
        signal,
      })
      if (r.status === 401) {
        // Critical #1: Stop on auth failure
        failed += actions.length - (synced + failed)
        break
      }
      if (r.ok) {
        await removeFromQueue(action.id)
        synced++
      } else if (r.status >= 400 && r.status < 500) {
        // Client error — remove, don't retry
        await removeFromQueue(action.id)
        failed++
      } else {
        await incrementRetry(action.id)
        failed++
      }
    } catch {
      if (signal.aborted) break
      await incrementRetry(action.id)
      failed++
    }
  }

  return { synced, failed }
}
