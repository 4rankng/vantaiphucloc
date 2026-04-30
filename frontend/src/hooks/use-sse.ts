import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/hooks/use-queries'
import { getAccessToken } from '@/services/api/client'

/**
 * Hook that connects to the SSE notification stream using fetch API
 * (so we can send Authorization header — native EventSource can't).
 *
 * When a notification event arrives, invalidates the notifications query
 * so the bell badge + panel refreshes instantly.
 *
 * Graceful fallback: if SSE fails, existing 60s polling still works.
 */
export function useSSENotifications() {
  const qc = useQueryClient()
  const abortRef = useRef<AbortController | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)

  const connect = useCallback(async () => {
    const token = getAccessToken()
    if (!token) return

    // Clean up previous connection
    if (abortRef.current) {
      abortRef.current.abort()
    }
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await fetch('/api/v1/sse/notifications', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'text/event-stream',
        },
        signal: controller.signal,
      })

      if (!response.ok || !response.body) {
        // SSE not available — polling still works
        return
      }

      const reader = response.body.getReader()
      readerRef.current = reader
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('event: notification')) {
            // Next "data:" line(s) will contain the payload
            // For simplicity, just invalidate — the polling fetch handles the rest
            qc.invalidateQueries({ queryKey: queryKeys.notifications })
          }
          // Ignore heartbeats (": heartbeat") and other events
        }
      }
    } catch (err) {
      if (controller.signal.aborted) return // Clean disconnect
      // Connection lost — schedule reconnect
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      reconnectTimer.current = setTimeout(connect, 10_000)
    }
  }, [qc])

  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (readerRef.current) readerRef.current.cancel().catch(() => {})
      if (abortRef.current) abortRef.current.abort()
    }
  }, [connect])
}
