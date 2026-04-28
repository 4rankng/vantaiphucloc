'use client'

import type { ReactNode } from 'react'
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { isFullyOnline, onNetworkChange } from '@/lib/network'
import {
  syncQueue,
  syncUploads,
  getQueueCount,
  clearExpiredCache,
  cleanupOrphanUploads,
  getQueue,
  removeFromQueue,
  type QueuedAction,
} from '@/lib/offline-db'

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

export function useOffline() {
  const ctx = useContext(OfflineContext)
  if (!ctx) throw new Error('useOffline must be used within OfflineProvider')
  return ctx
}

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(isFullyOnline)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null)
  const prevOnlineRef = useRef(isOnline)

  // Listen for connectivity changes (browser + backend health)
  useEffect(() => {
    const unsub = onNetworkChange((online) => {
      setIsOnline(online)
    })
    return unsub
  }, [])

  // Load count on mount
  useEffect(() => {
    getQueueCount().then(n => setPendingCount(n))
  }, [])

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && !prevOnlineRef.current && pendingCount > 0) {
      syncNow()
    }
    prevOnlineRef.current = isOnline
  }, [isOnline])

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

  const syncNow = useCallback(async (): Promise<{ synced: number; failed: number }> => {
    if (!isFullyOnline()) return { synced: 0, failed: 0 }
    if (syncing) return { synced: 0, failed: 0 }

    setSyncing(true)
    setSyncProgress({ total: 0, synced: 0, failed: 0 })

    try {
      // Phase 1: batch sync work-order POSTs
      const queue = await getQueue()
      const workOrderPosts = queue.filter(a => a.endpoint === '/api/v1/work-orders' && a.method === 'POST')
      const otherActions = queue.filter(a => !(a.endpoint === '/api/v1/work-orders' && a.method === 'POST'))

      let totalSynced = 0
      let totalFailed = 0
      const totalItems = workOrderPosts.length + otherActions.length
      setSyncProgress({ total: totalItems, synced: 0, failed: 0 })

      // Batch work-order POSTs
      if (workOrderPosts.length > 0) {
        try {
          const token = localStorage.getItem('access_token')
          const res = await fetch('/api/v1/work-orders/batch', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              items: workOrderPosts.map(a => a.body),
            }),
          })

          if (res.ok || res.status === 207) {
            const results = await res.json() as Array<{ index: number; id: number; success: boolean; error?: string }>
            for (const r of results) {
              const action = workOrderPosts[r.index]
              if (action) {
                if (r.success) {
                  await removeFromQueue(action.id)
                  totalSynced++
                } else {
                  totalFailed++
                }
              }
            }
          } else {
            // Batch endpoint failed, fall back to individual sync
            for (const action of workOrderPosts) {
              try {
                const r = await fetch(action.endpoint, {
                  method: action.method,
                  headers: { 'Content-Type': 'application/json' },
                  body: action.body ? JSON.stringify(action.body) : undefined,
                })
                if (r.ok) {
                  await removeFromQueue(action.id)
                  totalSynced++
                } else {
                  totalFailed++
                }
              } catch {
                totalFailed++
              }
            }
          }
        } catch {
          // Batch call itself failed, fall back to individual
          for (const action of workOrderPosts) {
            try {
              const r = await fetch(action.endpoint, {
                method: action.method,
                headers: { 'Content-Type': 'application/json' },
                body: action.body ? JSON.stringify(action.body) : undefined,
              })
              if (r.ok) {
                await removeFromQueue(action.id)
                totalSynced++
              } else {
                totalFailed++
              }
            } catch {
              totalFailed++
            }
          }
        }
        setSyncProgress({ total: totalItems, synced: totalSynced, failed: totalFailed })
      }

      // Phase 2: sync other actions individually
      if (otherActions.length > 0) {
        const otherResult = await syncQueue()
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
    }
  }, [syncing])

  return (
    <OfflineContext.Provider value={{ isOnline, pendingCount, syncing, syncProgress, queueAction, clearQueue, syncNow }}>
      {children}
    </OfflineContext.Provider>
  )
}
