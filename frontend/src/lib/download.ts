/**
 * Download a remote image as a file.
 *
 * Fetches the image as a Blob and triggers the download via a same-origin
 * `blob:` URL. This is required because the native `<a download>` attribute is
 * ignored by the browser for cross-origin URLs — there it merely opens the
 * image in a new tab instead of downloading it.
 *
 * Falls back to opening the URL in a new tab if the fetch is blocked (e.g. the
 * host sends no CORS headers), so the user can still save the image manually.
 */
export async function downloadImage(url: string, fallbackName = 'anh'): Promise<void> {
  const filename = resolveFilename(url, fallbackName)

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const objectUrl = URL.createObjectURL(await res.blob())
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    // Delay revoke: Safari/iOS can cancel the download if the URL is revoked too soon.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer')
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
