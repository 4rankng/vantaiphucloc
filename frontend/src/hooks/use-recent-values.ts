import { useState, useCallback } from 'react'

/**
 * Generic localStorage-backed recent-values hook.
 *
 * Stores up to `maxItems` unique strings under the given key, most-recent-first.
 * All localStorage ops are wrapped in try/catch for safety (matches PulseHint pattern).
 *
 * @param key        Full localStorage key (e.g. `ttransport_recent_vessels_42`)
 * @param maxItems   Maximum items to keep (default 5)
 */
export function useRecentValues(key: string, maxItems = 5) {
  const [recentValues, setRecentValues] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return []
      const parsed: unknown = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
    } catch {
      return []
    }
  })

  const addRecent = useCallback((value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return

    setRecentValues(prev => {
      // Dedupe: move existing to front
      const filtered = prev.filter(v => v !== trimmed)
      const next = [trimmed, ...filtered].slice(0, maxItems)
      try {
        localStorage.setItem(key, JSON.stringify(next))
      } catch { /* quota exceeded — ignore */ }
      return next
    })
  }, [key, maxItems])

  return { recentValues, addRecent }
}
