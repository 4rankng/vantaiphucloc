'use client'

import { useState, type ReactNode } from 'react'

const STORAGE_PREFIX = 'tth-hint-dismissed-'

export function PulseHint({
  children,
  hintKey,
  className = '',
}: {
  children: ReactNode
  hintKey: string
  className?: string
}) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_PREFIX + hintKey)
      return stored === '1'
    } catch {
      return false
    }
  })

  const handleClick = () => {
    if (!dismissed) {
      setDismissed(true)
      try { localStorage.setItem(STORAGE_PREFIX + hintKey, '1') } catch { /* ignore write failure */ }
    }
  }

  return (
    <span className={`relative inline-flex ${className}`} onClick={handleClick}>
      {children}
      {!dismissed && (
        <span
          className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5"
          aria-hidden
        >
          <span
            className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
            style={{ background: 'var(--theme-status-warning)' }}
          />
          <span
            className="relative inline-flex h-2.5 w-2.5 rounded-full"
            style={{ background: 'var(--theme-status-warning)' }}
          />
        </span>
      )}
    </span>
  )
}
