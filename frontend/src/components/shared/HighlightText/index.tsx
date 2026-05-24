import { normalizeVietnamese } from '@/lib/search-utils'

export interface HighlightTextProps {
  text: string
  query: string
}

export function HighlightText({ text, query }: HighlightTextProps) {
  if (!query.trim()) return <>{text}</>
  const q = normalizeVietnamese(query.trim()).toLowerCase()
  const norm = normalizeVietnamese(text).toLowerCase()
  const idx = norm.indexOf(q)
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark
        style={{
          background: 'color-mix(in srgb, var(--accent) 18%, transparent)',
          color: 'inherit',
          fontWeight: 700,
          borderRadius: 2,
          padding: '0 1px',
        }}
      >
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  )
}
