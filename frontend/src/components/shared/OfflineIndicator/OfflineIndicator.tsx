import { WifiOff, CloudOff, RefreshCw } from 'lucide-react'
import { useOffline } from '@/contexts/OfflineContext'

export function OfflineIndicator() {
  const { isOnline, pendingCount, syncing, syncProgress, syncNow } = useOffline()

  if (isOnline && pendingCount === 0) return null

  // Online but has pending items to sync
  if (isOnline && pendingCount > 0) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 mb-16 md:mb-0 animate-slide-up">
        <div className="mx-4 mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 shadow-lg dark:border-blue-800 dark:bg-blue-950/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CloudOff className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {syncing
                  ? `Đang đồng bộ ${syncProgress ? `(${syncProgress.synced}/${syncProgress.total})` : '...'}`
                  : `${pendingCount} chờ đồng bộ`}
              </span>
            </div>
            {!syncing && (
              <button
                onClick={syncNow}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900/50 touch-manipulation"
              >
                <RefreshCw className="h-3 w-3" />
                Đồng bộ
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Fully offline
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 mb-16 md:mb-0 animate-slide-up">
      <div className="mx-4 mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 shadow-lg dark:border-amber-800 dark:bg-amber-950/30">
        <div className="flex items-center gap-3">
          <WifiOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
            Bạn đang ngoại tuyến
          </span>
        </div>
        <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
          {pendingCount > 0 ? (
            <span className="inline-flex items-center gap-1">
              <CloudOff className="h-3 w-3" />
              {pendingCount} hành động chờ đồng bộ
            </span>
          ) : (
            'Dữ liệu sẽ được đồng bộ khi có kết nối'
          )}
        </p>
      </div>
    </div>
  )
}
