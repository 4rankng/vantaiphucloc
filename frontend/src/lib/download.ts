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
 *  1. Read the blob synchronously from the cache. On a cache miss (user
 *     tapped faster than the prefetch finished, or CORS blocked prefetch),
 *     trigger a direct URL download/open while the tap is still active.
 *  2. Warm the cache in the background after a direct fallback.
 *  3. Prefer the Web Share API with a File when the browser supports sharing
 *     files → native share sheet with "Save Image" / "Save to Files".
 *  4. Fall back to a synthetic `<a download>` for desktop browsers without
 *     Web Share file support.
 */

/** Resolved-image cache, keyed by source URL. Bounded to BLOB_CACHE_MAX. */
const blobCache = new Map<string, Blob>()
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
export function prefetchImageBlob(url: string): void {
  if (blobCache.has(url)) return
  fetch(url)
    .then((res) => (res.ok ? res.blob() : Promise.reject(new Error(`HTTP ${res.status}`))))
    .then((blob) => cacheBlob(url, blob))
    .catch(() => {
      /* CORS / network failure — leave uncached; downloadImage falls back. */
    })
}

export async function downloadImage(url: string, fallbackName = 'anh'): Promise<void> {
  const filename = resolveFilename(url, fallbackName)

  // Read the blob synchronously when prefetched so navigator.share() stays
  // inside the user gesture. If the prefetch has not completed, avoid awaiting
  // here: mobile browsers can block share sheets and new tabs after an await.
  const blob = blobCache.get(url)
  if (!blob) {
    triggerDirectImageDownload(url, filename)
    prefetchImageBlob(url)
    return
  }

  const file = new File([blob], filename, { type: blob.type || 'image/jpeg' })

  // Web Share API path (iOS Safari, Android Chrome, desktop Safari). This is
  // the only path that actually saves an image on iOS. `canShare` may THROW
  // (not just return false) in some Safari versions, so guard with try/catch.
  if (canShareFiles(file)) {
    try {
      await navigator.share({ files: [file], title: filename })
      return
    } catch (err) {
      // User dismissed the share sheet — stop. Don't fall through to the
      // anchor download, which on iOS would just open the blob in a tab.
      if (err instanceof DOMException && err.name === 'AbortError') return
    }
  }

  // Desktop fallback: synthetic <a download> on a blob URL.
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Delay revoke: Safari/iOS can cancel the download if the URL is revoked too soon.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}

function triggerDirectImageDownload(url: string, filename: string): void {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  a.remove()
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
