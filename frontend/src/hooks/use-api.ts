'use client'

import { useState, useCallback, useRef } from 'react'
import api from '@/services/api/client'
import type { ApiError } from '@/lib/error-utils'
import { useOffline } from '@/contexts/OfflineContext'

export function useApi<T = unknown>() {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const { isOnline, queueAction } = useOffline()
  const lastConfigRef = useRef<Parameters<typeof api.request>[0] | null>(null)

  const execute = useCallback(async (config: Parameters<typeof api.request>[0]): Promise<T> => {
    setLoading(true); setError(null)
    lastConfigRef.current = config
    try {
      const r = await api.request(config)
      setData(r.data as T)
      return r.data as T
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError)
      if (!isOnline && config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
        queueAction({ endpoint: config.url || '', method: config.method.toUpperCase() as 'POST' | 'PUT' | 'PATCH' | 'DELETE', body: config.data })
      }
      throw apiError
    } finally { setLoading(false) }
  }, [isOnline, queueAction])

  const reset = useCallback(() => { setData(null); setError(null); setLoading(false) }, [])
  const retry = useCallback(() => { if (lastConfigRef.current) execute(lastConfigRef.current) }, [execute])

  return { data, loading, error, execute, reset, retry }
}
