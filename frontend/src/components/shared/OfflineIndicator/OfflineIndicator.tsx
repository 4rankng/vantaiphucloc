import { WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOffline } from '@/contexts/OfflineContext'

export function OfflineIndicator() {
  const { isOnline, pendingActions } = useOffline()

  if (isOnline) return null

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
          {pendingActions.length > 0
            ? `${pendingActions.length} hành động chờ đồng bộ`
            : 'Dữ liệu sẽ được đồng bộ khi có kết nối'}
        </p>
      </div>
    </div>
  )
}
