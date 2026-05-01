import { WifiOff, CloudOff, RefreshCw, Loader2 } from 'lucide-react'
import { useOffline } from '@/contexts/OfflineContext'
import { useState, useEffect } from 'react'

/**
 * useOfflineIndicatorState — shared logic for offline display.
 *
 * Returns:
 *  - isOnline / pendingCount / syncing / syncProgress / syncNow  (from context)
 *  - collapsed: true after 2 s of being offline → show icon-only mode
 *  - graceExpired: false for first 5 s → suppress false-positive on load
 */
export function useOfflineIndicatorState() {
  const ctx = useOffline()
  const [graceExpired, setGraceExpired] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  // 5-second grace on page load to avoid false-positive flash
  useEffect(() => {
    const t = setTimeout(() => setGraceExpired(true), 5000)
    return () => clearTimeout(t)
  }, [])

  // After 2 s of being offline, collapse the banner to icon-only
  useEffect(() => {
    if (!ctx.isOnline && graceExpired) {
      const t = setTimeout(() => setCollapsed(true), 2000)
      return () => clearTimeout(t)
    } else {
      // Reset collapse when back online
      setCollapsed(false)
    }
  }, [ctx.isOnline, graceExpired])

  return { ...ctx, graceExpired, collapsed }
}

// ─────────────────────────────────────────────────────────────────────────────
// Topbar icon — rendered inside AppTopBar when offline
// ─────────────────────────────────────────────────────────────────────────────

/**
 * OfflineTopBarIcon — a small WifiOff icon that sits in the topbar right section.
 * Only visible when offline (and grace period has passed).
 */
export function OfflineTopBarIcon() {
  const { isOnline, pendingCount, graceExpired, collapsed } = useOfflineIndicatorState()

  // Only show once the banner has collapsed (or if we're in collapsed state)
  if (isOnline && pendingCount === 0) return null
  if (!graceExpired) return null
  if (!collapsed && !isOnline) return null  // banner is still showing, don't duplicate

  if (!isOnline) {
    return (
      <div
        className="w-8 h-8 flex items-center justify-center rounded-full shrink-0"
        style={{ background: 'rgba(255,255,255,0.2)' }}
        title="Bạn đang ngoại tuyến"
        aria-label="Ngoại tuyến"
      >
        <WifiOff className="w-[17px] h-[17px] text-amber-300" />
      </div>
    )
  }

  // Online but pending sync
  return (
    <div
      className="w-8 h-8 flex items-center justify-center rounded-full shrink-0"
      style={{ background: 'rgba(255,255,255,0.2)' }}
      title={`${pendingCount} mục chờ đồng bộ`}
      aria-label="Chờ đồng bộ"
    >
      <CloudOff className="w-[17px] h-[17px]" style={{ color: 'var(--theme-text-on-brand)', opacity: 0.8 }} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Floating banner — shown for 2 s then disappears (icon takes over in topbar)
// ─────────────────────────────────────────────────────────────────────────────

export function OfflineIndicator() {
  const { isOnline, pendingCount, syncing, syncProgress, syncNow, graceExpired, collapsed } =
    useOfflineIndicatorState()

  if (isOnline && pendingCount === 0) return null
  if (!isOnline && !graceExpired) return null
  // Once collapsed, the topbar icon takes over — hide the floating banner
  if (!isOnline && collapsed) return null

  // ── Online but has pending items to sync ─────────────────────────────────
  if (isOnline && pendingCount > 0) {
    return (
      <div className="fixed top-4 left-4 right-4 z-[200] flex justify-center md:left-auto md:right-4 md:justify-end pointer-events-none">
        <div
          className="pointer-events-auto flex items-center gap-2.5 rounded-full px-4 py-2.5 shadow-lg ring-1 ring-black/5 animate-in slide-in-from-top-2 fade-in duration-300"
          style={{
            background: 'var(--theme-bg-secondary)',
            border: '1px solid var(--theme-border-default)',
          }}
        >
          {syncing ? (
            <Loader2
              className="h-4 w-4 shrink-0 animate-spin"
              style={{ color: 'var(--theme-brand-primary)' }}
            />
          ) : (
            <CloudOff
              className="h-4 w-4 shrink-0"
              style={{ color: 'var(--theme-status-info)' }}
            />
          )}
          <span
            className="text-sm font-medium whitespace-nowrap"
            style={{ color: 'var(--theme-text-primary)' }}
          >
            {syncing
              ? `Đang đồng bộ${syncProgress ? ` ${syncProgress.synced}/${syncProgress.total}` : '…'}`
              : `${pendingCount} mục chờ đồng bộ`}
          </span>
          {!syncing && (
            <button
              onClick={syncNow}
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold touch-manipulation transition-colors"
              style={{
                background: 'var(--theme-brand-primary)',
                color: 'var(--theme-text-on-brand)',
              }}
            >
              <RefreshCw className="h-3 w-3" />
              Đồng bộ
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Fully offline — show banner for 2 s then collapse to topbar icon ──────
  return (
    <div className="fixed top-4 left-4 right-4 z-[200] flex justify-center md:left-auto md:right-4 md:justify-end pointer-events-none">
      <div
        className="pointer-events-auto flex items-center gap-2.5 rounded-full px-4 py-2.5 shadow-lg ring-1 ring-black/5 animate-in slide-in-from-top-2 fade-in duration-300"
        style={{
          background: '#78350f',
          border: '1px solid #92400e',
        }}
      >
        <WifiOff className="h-4 w-4 shrink-0 text-amber-300" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-100 whitespace-nowrap">
            Bạn đang ngoại tuyến
          </p>
          <p className="text-xs text-amber-300 whitespace-nowrap">
            {pendingCount > 0
              ? `${pendingCount} hành động chờ đồng bộ`
              : 'Dữ liệu sẽ đồng bộ khi có kết nối'}
          </p>
        </div>
      </div>
    </div>
  )
}
