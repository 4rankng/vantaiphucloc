import { useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui'
import { Loader2, Sparkles, Check, XCircle } from 'lucide-react'
import { useAISuggestMatch, useConfirmAutoMatch } from '@/hooks/use-queries'
import type { DeliveredTrip } from '@/data/domain'

export function AISuggestionDialog({
  trip,
  onClose,
}: {
  trip: DeliveredTrip
  onClose: () => void
}) {
  const { mutate: suggestMatch, data, isPending, error } = useAISuggestMatch()
  const { mutate: confirmMatch, isPending: isConfirming } = useConfirmAutoMatch()

  useEffect(() => {
    suggestMatch(trip.id)
  }, [trip.id, suggestMatch])

  const handleConfirm = () => {
    if (!data?.suggestedBookedTripId) return
    confirmMatch(
      [{ deliveredTripId: trip.id, bookedTripId: data.suggestedBookedTripId }],
      {
        onSuccess: () => {
          onClose()
        },
      }
    )
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            AI Suggestion
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {isPending && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
                Gemini đang phân tích chuyến xe để tìm đề xuất...
              </p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <XCircle className="h-8 w-8 text-red-500" />
              <p className="text-sm text-red-600">
                Đã xảy ra lỗi khi gọi AI. Vui lòng thử lại sau.
              </p>
            </div>
          )}

          {data && !isPending && (
            <div className="space-y-4">
              {data.suggestedBookedTripId ? (
                <>
                  <div className="p-4 rounded-md bg-blue-50 border border-blue-100">
                    <p className="text-sm font-medium text-blue-900 mb-2">
                      Đề xuất ghép với Lệnh (TO) #{data.suggestedBookedTripId}
                    </p>
                    <p className="text-sm text-blue-800 leading-relaxed">
                      {data.reasoning}
                    </p>
                  </div>
                  <div className="text-xs" style={{ color: 'var(--ink-3)' }}>
                    Mức độ tin cậy:{' '}
                    <span className="font-semibold capitalize">
                      {data.confidence === 'high' ? 'Cao' : data.confidence === 'medium' ? 'Trung bình' : 'Thấp'}
                    </span>
                  </div>
                </>
              ) : (
                <div className="p-4 rounded-md bg-gray-50 border border-gray-200">
                  <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
                    {data.reasoning || 'Không tìm thấy chuyến xe nào phù hợp để ghép.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isConfirming}>
            Đóng
          </Button>
          {data?.suggestedBookedTripId && !isPending && (
            <Button
              onClick={handleConfirm}
              disabled={isConfirming}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isConfirming ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Xác nhận ghép
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
