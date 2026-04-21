'use client'

import type { ReactNode } from 'react'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useNetwork } from '@/hooks/use-network'
import * as db from '@/lib/offline-db'

interface OfflineContextValue {
  isOnline: boolean
  pendingCount: number
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
  const { isOnline } = useNetwork()
  const [pendingCount, setPendingCount] = useState(0)

  // Load count on mount
  useEffect(() => {
    db.getQueueCount().then(n => setPendingCount(n))
  }, [])

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncNow()
    }
  }, [isOnline])

  const queueAction = useCallback(async (action: { endpoint: string; method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown }) => {
    await db.enqueue(action)
    const count = await db.getQueueCount()
    setPendingCount(count)
  }, [])

  const clearQueue = useCallback(async () => {
    await db.clearQueue()
    setPendingCount(0)
  }, [])

  const syncNow = useCallback(async () => {
    if (!isOnline) return { synced: 0, failed: 0 }
    const result = await db.syncQueue()
    const count = await db.getQueueCount()
    setPendingCount(count)
    // Also sync pending uploads
    await db.syncUploads()
    return result
  }, [isOnline])

  return (
    <OfflineContext.Provider value={{ isOnline, pendingCount, queueAction, clearQueue, syncNow }}>
      {children}
    </OfflineContext.Provider>
  )
}
