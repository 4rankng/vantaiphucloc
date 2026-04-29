'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useNetwork } from '@/hooks/use-network'

interface Options {
  enabled?: boolean
  background?: boolean
  maxBackoffMs?: number
}

export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
  options: Options = {}
) {
  const { enabled = true, background = false, maxBackoffMs = 300000 } = options
  const { isOnline } = useNetwork()
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const backoffRef = useRef(intervalMs)
  const mountedRef = useRef(true)

  const fetch = useCallback(async () => {
    if (!enabled || !isOnline) return
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      if (mountedRef.current) { setData(result); setError(null); backoffRef.current = intervalMs }
    } catch (err) {
      if (mountedRef.current) {
        setError(err as Error)
        backoffRef.current = Math.min(backoffRef.current * 2, maxBackoffMs)
      }
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [enabled, isOnline, fetcher, intervalMs, maxBackoffMs])

  useEffect(() => {
    if (enabled && isOnline) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetch()
    }
  }, [enabled, isOnline])

  useEffect(() => {
    if (!enabled) return
    let timer: ReturnType<typeof setTimeout>
    const poll = () => {
      if (!background && document.hidden) { timer = setTimeout(poll, intervalMs); return }
      fetch()
      const delay = error ? backoffRef.current : intervalMs
      timer = setTimeout(poll, delay)
    }
    timer = setTimeout(poll, intervalMs)
    return () => clearTimeout(timer)
  }, [enabled, fetch, intervalMs, error, background, isOnline])

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  return { data, loading, error, refresh: fetch }
}
