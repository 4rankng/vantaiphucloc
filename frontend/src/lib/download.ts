/**
 * Download a remote image as a file.
 *
 * Why prefetch? `navigator.share({ files })` — the only reliable way to save
 * an image on iOS Safari, which ignores the `<a download>` attribute on blob
 * URLs — MUST run inside an active transient user activation. Any `await`
 * between the user's tap and `share()` (e.g. `await fetch()`) invalidates
 * that activation, so Safari throws `NotAllowedError`, the share sheet never
 * appears, and to the user "nothing happens".
 *
 * To keep `share()` synchronous with the gesture we prefetch the blob when
 * the lightbox opens (see `prefetchImageBlob`). By the time the user taps
 * "Tải về" the blob is already cached and `downloadImage` can build the
 * `File` and invoke `share()` without awaiting anything first.
 *
 * Strategy:
 *  1. Read the blob synchronously from the cache.
 *  2. On iOS/Android cache miss, trigger a direct URL download/open while the
 *     tap is still active, then warm the cache in the background.
 *  3. On desktop, trigger a direct same-origin `<a download>` immediately
 *     instead of waiting for fetch; Safari can ignore downloads started after
 *     async work loses the original user activation.
 *  4. Use the Web Share API only on mobile browsers where normal download
 *     links are unreliable.
 */

/** Resolved-image cache, keyed by source URL. Bounded to BLOB_CACHE_MAX. */
const blobCache = new Map<string, Blob>()
const blobPrefetches = new Map<string, Promise<Blob | null>>()
const BLOB_CACHE_MAX = 10

function cacheBlob(url: string, blob: Blob): void {
  blobCache.set(url, blob)
  // Map preserves insertion order — evict the oldest entry to bound memory.
  while (blobCache.size > BLOB_CACHE_MAX) {
    const next = blobCache.keys().next()
    if (next.done) break
    blobCache.delete(next.value)
  }
}

/**
 * Fetch an image now and cache its bytes so a later `downloadImage` call can
 * invoke `navigator.share` synchronously within the user gesture. Safe to
 * call repeatedly for the same URL (no-op once cached). Errors are swallowed
 * — a failed prefetch simply means `downloadImage` will fetch on demand.
 */
export function prefetchImageBlob(url: string): Promise<Blob | null> {
  const cached = blobCache.get(url)
  if (cached) return Promise.resolve(cached)

  const pending = blobPrefetches.get(url)
  if (pending) return pending

  const pendingFetch = fetchImageBlob(url)
    .then((blob) => cacheBlob(url, blob))
    .then(() => blobCache.get(url) ?? null)
    .catch(() => null)
    .finally(() => {
      blobPrefetches.delete(url)
    })
  blobPrefetches.set(url, pendingFetch)
  return pendingFetch
}

export async function downloadImage(url: string, fallbackName = 'anh'): Promise<void> {
  const filename = resolveFilename(url, fallbackName)
  const shouldShare = shouldUseNativeShare()

  if (!shouldShare) {
    triggerDirectImageDownload(url, filename)
    return
  }

  // Read the blob synchronously when prefetched so navigator.share() stays
  // inside the user gesture. If the prefetch has not completed, avoid awaiting
  // here: mobile browsers can block share sheets and new tabs after an await.
  const blob = blobCache.get(url)
  if (!blob) {
    await shareImageUrl(url, filename)
    return
  }

  // Web Share API path (iOS Safari, Android Chrome). This is the only path that
  // reliably saves images on iOS. Desktop browsers should download directly
  // because sharing is not equivalent to "Tải về".
  if (shouldShare && typeof File !== 'undefined') {
    const file = new File([blob], filename, { type: blob.type || 'image/jpeg' })
    try {
      if (canShareFiles(file)) {
        await navigator.share({ files: [file], title: filename })
        return
      }
    } catch (err) {
      // User dismissed the share sheet — stop. Don't fall through to the
      // anchor download, which on iOS would just open the blob in a tab.
      if (err instanceof DOMException && err.name === 'AbortError') return
    }
  }

  if (shouldShare) {
    await shareImageUrl(url, filename)
    return
  }
}

function fetchImageBlob(url: string): Promise<Blob> {
  return fetch(url).then((res) => (res.ok ? res.blob() : Promise.reject(new Error(`HTTP ${res.status}`))))
}

function triggerDirectImageDownload(url: string, filename: string): void {
  const absoluteUrl = resolveAbsoluteUrl(url)
  const a = document.createElement('a')
  a.href = absoluteUrl
  a.download = filename
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

async function shareImageUrl(url: string, filename: string): Promise<void> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: filename, url: resolveAbsoluteUrl(url) })
      return
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
    }
  }
  triggerDirectImageDownload(url, filename)
}

function canShareFiles(file: File): boolean {
  if (typeof navigator === 'undefined') return false
  if (typeof navigator.share !== 'function') return false
  if (typeof navigator.canShare !== 'function') return false
  try {
    return navigator.canShare({ files: [file] })
  } catch {
    return false
  }
}

function shouldUseNativeShare(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const platform = navigator.platform || ''
  return /Android/i.test(ua) || /iPad|iPhone|iPod/i.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function shouldPrepareImageDownload(): boolean {
  if (!shouldUseNativeShare()) return false
  if (typeof navigator === 'undefined') return false
  return typeof navigator.share === 'function'
}

/** Pick a sensible filename: the last URL path segment when it has an extension, else the fallback + `.jpg`. */
function resolveFilename(url: string, fallback: string): string {
  try {
    const last = new URL(url, window.location.href).pathname.split('/').filter(Boolean).pop()
    if (last && /\.[A-Za-z0-9]{2,5}$/.test(last)) return decodeURIComponent(last)
  } catch {
    // not a parseable URL — fall through to the fallback
  }
  const base = fallback.trim() || 'anh'
  return /\.[A-Za-z0-9]{2,5}$/.test(base) ? base : `${base}.jpg`
}

function resolveAbsoluteUrl(url: string): string {
  try {
    return new URL(url, window.location.href).href
  } catch {
    return url
  }
}
