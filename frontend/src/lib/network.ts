/** Network status detection — pure logic, no React */

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

export function onNetworkChange(callback: (online: boolean) => void): () => void {
  const goOnline = () => callback(true)
  const goOffline = () => callback(false)
  window.addEventListener('online', goOnline)
  window.addEventListener('offline', goOffline)
  return () => {
    window.removeEventListener('online', goOnline)
    window.removeEventListener('offline', goOffline)
  }
}
