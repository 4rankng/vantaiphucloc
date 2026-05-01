import { WifiOff, CloudOff, RefreshCw, Loader2 } from 'lucide-react'
import { useOffline } from '@/contexts/OfflineContext'
import { useState, useEffect } from 'react'

/**
 * OfflineIndicator — compact pill snackbar anchored to the top of the screen.
 *
 * Positioning:
 *  - Mobile  : top-4, centered horizontally (mx-auto), max-w-sm
 *  - Desktop : top-4, right-4 (md:right-4 md:left-auto md:mx-0)
 *
 * This keeps it well clear of the login card and any bottom-anchored content.
 */
export function OfflineIndicator() {
  const { isOnline, pendingCount, syncing, syncProgress, syncNow } = useOffline()
  // Grace period: don't show the offline banner for the first 5 seconds after
  // page load. This prevents a false-positive flash while the health check runs.
  const [graceExpired, setGraceExpired] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setGraceExpired(true), 5000)
    return () => clearTimeout(t)
  }, [])

  if (isOnline && pendingCount === 0) return null
  // Suppress the offline banner during the grace period (pending sync is still shown)
  if (!isOnline && !graceExpired) return null

  // ── Online but has pending items to sync ──────────────────────────────────
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

  // ── Fully offline ─────────────────────────────────────────────────────────
  return (
    <div className="fixed top-4 left-4 right-4 z-[200] flex justify-center md:left-auto md:right-4 md:justify-end pointer-events-none">
      <div
        className="pointer-events-auto flex items-center gap-2.5 rounded-full px-4 py-2.5 shadow-lg ring-1 ring-black/5 animate-in slide-in-from-top-2 fade-in duration-300"
        style={{
          background: '#78350f',   /* amber-900 — rich, readable dark amber */
          border: '1px solid #92400e',
        }}
      >
        <WifiOff className="h-4 w-4 shrink-0 text-amber-300" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-100 whitespace-nowrap">
            Bạn đang ngoại tuyến
          </p>
          {pendingCount > 0 && (
            <p className="text-xs text-amber-300 whitespace-nowrap">
              {pendingCount} hành động chờ đồng bộ
            </p>
          )}
          {pendingCount === 0 && (
            <p className="text-xs text-amber-300 whitespace-nowrap">
              Dữ liệu sẽ đồng bộ khi có kết nối
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
