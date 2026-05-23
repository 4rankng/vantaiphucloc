export function formatMatchDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const [, m, d] = dateStr.split('-')
  if (!d) return dateStr
  return `${d}/${m}`
}
