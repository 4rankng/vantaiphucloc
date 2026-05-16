'use client'

import { useEffect, useState, type ReactNode } from 'react'

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
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_PREFIX + hintKey)
      setDismissed(stored === '1')
    } catch {
      setDismissed(false)
    }
  }, [hintKey])

  const handleClick = () => {
    if (!dismissed) {
      setDismissed(true)
      try { localStorage.setItem(STORAGE_PREFIX + hintKey, '1') } catch {}
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
            style={{ background: '#f97316' }}
          />
          <span
            className="relative inline-flex h-2.5 w-2.5 rounded-full"
            style={{ background: '#f97316' }}
          />
        </span>
      )}
    </span>
  )
}
