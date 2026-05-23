import type { CSSProperties } from 'react'

export const tdActive: CSSProperties = {
  padding: '5px 8px',
  position: 'relative',
}

export const tdHidden: CSSProperties = {
  padding: '5px 8px',
  cursor: 'text',
  opacity: 0,
  transition: 'opacity 0.15s',
}

export const tdDimmed: CSSProperties = {
  padding: '5px 8px',
  cursor: 'pointer',
  opacity: 0.45,
  transition: 'opacity 0.15s',
}
