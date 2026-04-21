'use client'

import { useState, useEffect, useCallback } from 'react'
import * as notifications from '@/lib/notifications'

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')

  useEffect(() => { setPermission(notifications.getPermissionStatus()) }, [])

  const doRequest = useCallback(async () => {
    const r = await notifications.requestPermission()
    setPermission(r)
    return r
  }, [])

  const notify = useCallback((title: string, body: string, opts?: NotificationOptions) => {
    notifications.sendLocalNotification(title, { body, ...opts })
  }, [])

  return { permission, requestPermission: doRequest, notify, canNotify: permission === 'granted' }
}
