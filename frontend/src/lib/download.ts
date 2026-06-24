/**
 * Download a remote image as a file.
 *
 * Strategy:
 *  1. Fetch the image as a Blob. If the fetch fails (e.g. CORS-blocked),
 *     fall back to opening the URL in a new tab so the user can still save
 *     it manually.
 *  2. Prefer the Web Share API with a File when the browser supports
 *     sharing files. iOS Safari ignores the `<a download>` attribute on
 *     blob URLs and would otherwise just open the blob in a new tab;
 *     `navigator.share({ files: [...] })` shows the native share sheet
 *     with a "Save Image" / "Save to Files" action, which is what users
 *     actually expect on iPhone.
 *  3. Fall back to the classic anchor-click download for desktop browsers
 *     that don't expose Web Share with files.
 */
export async function downloadImage(url: string, fallbackName = 'anh'): Promise<void> {
  const filename = resolveFilename(url, fallbackName)

  let blob: Blob
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    blob = await res.blob()
  } catch {
    // CORS-blocked or network failure — let the user grab the image manually.
    window.open(url, '_blank', 'noopener,noreferrer')
    return
  }

  // Web Share API path (iOS Safari, Android Chrome, desktop Safari).
  // `navigator.canShare` may be present but reject `files` if the browser
  // only supports sharing URLs, so guard both checks.
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function'
  ) {
    const file = new File([blob], filename, { type: blob.type || 'image/jpeg' })
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: filename })
        return
      } catch (err) {
        // User cancelled the share sheet (AbortError) or share failed for
        // some other reason — fall through to the anchor download.
        if (err instanceof DOMException && err.name === 'AbortError') return
      }
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
