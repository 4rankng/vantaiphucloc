import { api } from '@/services/api/client'

const VAPID_KEY_URL = '/push/vapid-public-key'
const SUBSCRIPTIONS_URL = '/push/subscriptions'

let _cachedVapidKey: string | null = null

async function getVapidPublicKey(): Promise<string> {
  if (_cachedVapidKey) return _cachedVapidKey
  const res = await api.get(VAPID_KEY_URL)
  _cachedVapidKey = res.data.public_key
  return _cachedVapidKey
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window
}

export function getPushPermissionState(): NotificationPermission {
  if (!('Notification' in window)) return 'denied'
  return Notification.permission
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return await Notification.requestPermission()
}

export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported()) return false

  const permission = await requestPushPermission()
  if (permission !== 'granted') return false

  try {
    const registration = await navigator.serviceWorker.ready
    const vapidKey = await getVapidPublicKey()

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })

    const subJson = subscription.toJSON()
    await api.post(SUBSCRIPTIONS_URL, {
      endpoint: subJson.endpoint,
      p256dh: subJson.keys?.p256dh,
      auth: subJson.keys?.auth,
      user_agent: navigator.userAgent,
    })

    return true
  } catch (error) {
    console.error('Push subscription failed:', error)
    return false
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      const subJson = subscription.toJSON()
      await subscription.unsubscribe()
      await api.delete(SUBSCRIPTIONS_URL, {
        data: {
          endpoint: subJson.endpoint,
          p256dh: subJson.keys?.p256dh,
          auth: subJson.keys?.auth,
        },
      })
    }
    return true
  } catch (error) {
    console.error('Push unsubscription failed:', error)
    return false
  }
}

export async function getPushSubscriptionStatus(): Promise<{
  supported: boolean
  permission: NotificationPermission
  subscribed: boolean
}> {
  const supported = isPushSupported()
  const permission = getPushPermissionState()
  let subscribed = false

  if (supported && permission === 'granted') {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      subscribed = !!subscription
    } catch {
      subscribed = false
    }
  }

  return { supported, permission, subscribed }
}
