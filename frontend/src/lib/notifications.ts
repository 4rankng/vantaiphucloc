export async function requestPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission !== 'denied') return await Notification.requestPermission()
  return Notification.permission
}

export function sendLocalNotification(title: string, options?: NotificationOptions): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  new Notification(title, { icon: '/pwa-192x192.png', ...options })
}

export function getPermissionStatus(): NotificationPermission {
  return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied'
}
