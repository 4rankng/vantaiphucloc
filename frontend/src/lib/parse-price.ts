export function parsePrice(v: string): number | null {
  if (!v.trim()) return null
  const n = parseInt(v.replace(/[,.]/g, ''), 10)
  return isNaN(n) ? null : n
}
