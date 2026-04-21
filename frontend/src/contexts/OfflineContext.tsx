'use client'

import type { ReactNode } from 'react'
import { createContext, useContext, useCallback, useEffect, useState } from 'react'
import { useNetwork } from '@/hooks/use-network'

interface QueuedAction {
  id: string
  timestamp: number
  endpoint: string
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
}

interface OfflineContextValue {
  isOnline: boolean
  pendingActions: QueuedAction[]
  queueAction: (action: Omit<QueuedAction, 'id' | 'timestamp'>) => void
  clearQueue: () => void
  syncNow: () => Promise<void>
}

const OfflineContext = createContext<OfflineContextValue | null>(null)
const QUEUE_KEY = 'ttransport_offline_queue'

function loadQueue(): QueuedAction[] {
  try { const d = localStorage.getItem(QUEUE_KEY); return d ? JSON.parse(d) : [] }
  catch { return [] }
}

function saveQueue(q: QueuedAction[]) { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)) }

export function useOffline() {
  const ctx = useContext(OfflineContext)
  if (!ctx) throw new Error('useOffline must be used within OfflineProvider')
  return ctx
}

export function OfflineProvider({ children }: { children: ReactNode }) {
  const { isOnline } = useNetwork()
  const [pendingActions, setPendingActions] = useState<QueuedAction[]>(() => loadQueue())

  useEffect(() => {
    if (isOnline && pendingActions.length > 0) syncQueue()
  }, [isOnline])

  const queueAction = useCallback((action: Omit<QueuedAction, 'id' | 'timestamp'>) => {
    const updated = [...pendingActions, { ...action, id: crypto.randomUUID(), timestamp: Date.now() }]
    setPendingActions(updated)
    saveQueue(updated)
  }, [pendingActions])

  const clearQueue = useCallback(() => { setPendingActions([]); saveQueue([]) }, [])

  const syncNow = useCallback(async () => {
    if (!isOnline || pendingActions.length === 0) return
    await syncQueue()
  }, [isOnline, pendingActions])

  async function syncQueue() {
    const queue = [...pendingActions]
    const synced: string[] = []
    for (const action of queue) {
      try {
        const r = await fetch(action.endpoint, {
          method: action.method,
          headers: { 'Content-Type': 'application/json' },
          body: action.body ? JSON.stringify(action.body) : undefined,
        })
        if (r.ok) synced.push(action.id)
      } catch { /* skip failed */ }
    }
    const remaining = queue.filter(a => !synced.includes(a.id))
    setPendingActions(remaining)
    saveQueue(remaining)
  }

  return (
    <OfflineContext.Provider value={{ isOnline, pendingActions, queueAction, clearQueue, syncNow }}>
      {children}
    </OfflineContext.Provider>
  )
}
