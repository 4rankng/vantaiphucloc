'use client'

import { useState, useEffect, useCallback } from 'react'
import * as notifications from '@/lib/notifications'
import {
  isPushSupported,
  getPushSubscriptionStatus,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push-subscription'

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [pushSupported, setPushSupported] = useState(false)
  const [pushSubscribed, setPushSubscribed] = useState(false)

  useEffect(() => {
    setPermission(notifications.getPermissionStatus())
    setPushSupported(isPushSupported())
    getPushSubscriptionStatus().then((status) => {
      setPushSubscribed(status.subscribed)
    })
  }, [])

  const doRequest = useCallback(async () => {
    const r = await notifications.requestPermission()
    setPermission(r)
    return r
  }, [])

  const enablePush = useCallback(async () => {
    const success = await subscribeToPush()
    setPushSubscribed(success)
    if (success) setPermission('granted')
    return success
  }, [])

  const disablePush = useCallback(async () => {
    const success = await unsubscribeFromPush()
    setPushSubscribed(!success)
    return success
  }, [])

  const notify = useCallback((title: string, body: string, opts?: NotificationOptions) => {
    notifications.sendLocalNotification(title, { body, ...opts })
  }, [])

  return {
    permission,
    requestPermission: doRequest,
    notify,
    canNotify: permission === 'granted',
    pushSupported,
    pushSubscribed,
    enablePush,
    disablePush,
  }
}
