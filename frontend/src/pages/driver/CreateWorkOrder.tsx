import { useState, useEffect, useCallback } from 'react'
import { Camera, Check, RotateCcw, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button/Button'
import { apiClient } from '@/services/api'
import { useDriverStore } from '@/hooks/use-driver-store'
import { formatCurrencyFull, WORK_TYPES, type Client, type RoutePrice, type WorkType } from '@/data/mockData'

export function CreateWorkOrder() {
  const { driver, navigate } = useDriverStore()
  const [clients, setClients] = useState<Client[]>([])
  const [routes, setRoutes] = useState<RoutePrice[]>([])

  // Step 1: Container photo + OCR
  const [containerPhotoTaken, setContainerPhotoTaken] = useState(false)
  const [ocrNumber, setOcrNumber] = useState('')

  // Form fields
  const [workType, setWorkType] = useState<WorkType>('E20')
  const [clientId, setClientId] = useState('')
  const [route, setRoute] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ earning: number; status: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([apiClient.getClients(), apiClient.getRoutes()]).then(([cRes, rRes]) => {
      if (!cancelled) {
        if (cRes.success) setClients(cRes.data)
        if (rRes.success) setRoutes(rRes.data)
      }
    })
    return () => { cancelled = true }
  }, [])

  const handleTakeContainerPhoto = useCallback(() => {
    setContainerPhotoTaken(true)
    // Simulate OCR
    const prefixes = ['MSKU', 'TCNU', 'HLCU', 'CSLU', 'TEMU']
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
    const num = String(Math.floor(Math.random() * 9000000) + 1000000)
    setOcrNumber(`${prefix}-${num}`)
  }, [])

  const handleRetakeContainer = useCallback(() => {
    setContainerPhotoTaken(false)
    setOcrNumber('')
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!ocrNumber.trim() || !clientId || !route) return
    setSubmitting(true)

    const client = clients.find(c => c.id === clientId)
    const res = await apiClient.createWorkOrder({
      workOrderNumber: ocrNumber.trim(),
      photoUrl: '',
      workType,
      clientId,
      clientName: client?.name ?? '',
      route,
      driverId: driver.id,
      driverName: driver.name,
      tractorPlate: driver.tractorPlate,
    })

    if (res.success) {
      setResult({ earning: res.data.earning, status: res.data.status })
    }
    setSubmitting(false)
  }, [ocrNumber, clientId, route, workType, clients, driver, navigate])

  // Success state
  if (result) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ background: 'var(--theme-status-success-light)' }}
        >
          <CheckCircle className="w-8 h-8" style={{ color: 'var(--theme-status-success)' }} />
        </div>
        <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--theme-text-primary)' }}>
          Gửi thành công!
        </h3>
        <p className="text-sm mb-4" style={{ color: 'var(--theme-text-muted)' }}>
          {ocrNumber} · {workType}
        </p>
        {result.earning > 0 ? (
          <div className="rounded-2xl p-4 mb-6 w-full max-w-xs" style={{ background: 'var(--theme-brand-primary-light)' }}>
            <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Thu nhập chuyến này</p>
            <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--theme-brand-primary)' }}>
              +{formatCurrencyFull(result.earning)}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl p-4 mb-6 w-full max-w-xs" style={{ background: 'var(--theme-status-warning-light)' }}>
            <p className="text-xs" style={{ color: 'var(--theme-status-warning)' }}>
              Chưa có đơn giá cho tuyến này. Kế toán sẽ cập nhật sau.
            </p>
          </div>
        )}
        <div className="flex gap-3 w-full max-w-xs">
          <Button
            onClick={() => {
              setResult(null)
              setContainerPhotoTaken(false)
              setOcrNumber('')
              setClientId('')
              setRoute('')
              setWorkType('E20')
            }}
            variant="outline"
            className="flex-1 h-11 font-bold rounded-xl"
          >
            Chụp tiếp
          </Button>
          <Button
            onClick={() => navigate('/driver')}
            className="flex-1 h-11 font-bold rounded-xl"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
          >
            Trang chủ
          </Button>
        </div>
      </div>
    )
  }

  const canSubmit = ocrNumber.trim() && clientId && route

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold" style={{ color: 'var(--theme-text-primary)' }}>Tạo số công</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>Chụp số cont và chọn thông tin</p>
      </div>

      {/* ── STEP 1: Container photo + OCR ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: containerPhotoTaken ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)', color: containerPhotoTaken ? 'var(--theme-text-on-brand)' : 'var(--theme-text-muted)' }}
          >
            1
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Chụp số công-ten-nơ</span>
        </div>

        <button
          onClick={handleTakeContainerPhoto}
          className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-colors touch-manipulation"
          style={{
            background: containerPhotoTaken ? 'var(--theme-bg-tertiary)' : 'var(--theme-bg-secondary)',
            borderColor: containerPhotoTaken ? 'var(--theme-brand-primary)' : 'var(--theme-border-default)',
          }}
          aria-label={containerPhotoTaken ? 'Chụp lại' : 'Chụp ảnh số công'}
        >
          {containerPhotoTaken ? (
            <>
              <div className="h-14 w-14 rounded-full flex items-center justify-center" style={{ background: 'var(--theme-brand-primary)' }}>
                <Check className="h-7 w-7" style={{ color: 'var(--theme-text-on-brand)' }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Đã chụp</p>
                <p className="text-lg font-bold font-mono mt-1" style={{ color: 'var(--theme-brand-primary)' }}>{ocrNumber}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleRetakeContainer() }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium mt-1"
                style={{ background: 'var(--theme-bg-secondary)', color: 'var(--theme-text-muted)' }}
              >
                <RotateCcw className="w-3 h-3" /> Chụp lại
              </button>
            </>
          ) : (
            <>
              <Camera className="h-10 w-10" style={{ color: 'var(--theme-text-muted)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--theme-text-secondary)' }}>Chạm để chụp ảnh</p>
              <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>PM sẽ tự động nhận diện số cont</p>
            </>
          )}
        </button>
      </div>

      {/* ── STEP 2: Select info ── */}
      {containerPhotoTaken && (
        <div className="space-y-4">
          {/* OCR edit */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>2</div>
              <span className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Kiểm tra số cont</span>
            </div>
            <input
              value={ocrNumber}
              onChange={e => setOcrNumber(e.target.value)}
              className="w-full h-11 rounded-xl px-4 text-sm font-mono font-semibold"
              style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)', color: 'var(--theme-text-primary)' }}
              placeholder="Số công-ten-nơ"
            />
            <p className="text-[11px] flex items-center gap-1" style={{ color: 'var(--theme-text-muted)' }}>
              <AlertCircle className="w-3 h-3" />
              Sửa nếu PM nhận diện không đúng
            </p>
          </div>

          {/* Cont size */}
          <div className="space-y-2">
            <span className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Kích thước cont</span>
            <div className="grid grid-cols-4 gap-2">
              {WORK_TYPES.map(wt => (
                <button key={wt} onClick={() => setWorkType(wt)}
                  className="py-3 rounded-xl text-sm font-bold transition-colors touch-manipulation"
                  style={{
                    background: workType === wt ? 'var(--theme-brand-primary)' : 'var(--theme-bg-secondary)',
                    color: workType === wt ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)',
                    border: `1px solid ${workType === wt ? 'var(--theme-brand-primary)' : 'var(--theme-border-default)'}`,
                  }}>
                  {wt}
                </button>
              ))}
            </div>
          </div>

          {/* Client */}
          <div className="space-y-2">
            <span className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Khách hàng</span>
            <select
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              className="w-full h-11 rounded-xl px-4 text-sm"
              style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)', color: 'var(--theme-text-primary)' }}
            >
              <option value="">Chọn khách hàng</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Route */}
          <div className="space-y-2">
            <span className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Cung đường</span>
            <select
              value={route}
              onChange={e => setRoute(e.target.value)}
              className="w-full h-11 rounded-xl px-4 text-sm"
              style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)', color: 'var(--theme-text-primary)' }}
            >
              <option value="">Chọn cung đường</option>
              {routes.map((r, i) => <option key={i} value={r.route}>{r.route}</option>)}
            </select>
          </div>

          {/* Driver info (auto) */}
          <div className="p-3 rounded-xl space-y-1" style={{ background: 'var(--theme-bg-tertiary)' }}>
            <p className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Thông tin xe (tự động)</p>
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--theme-text-secondary)' }}>Tài xế</span>
              <span className="font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{driver.name}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--theme-text-secondary)' }}>Biển số</span>
              <span className="font-semibold font-mono" style={{ color: 'var(--theme-text-primary)' }}>{driver.tractorPlate}</span>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full h-12 font-bold text-base rounded-2xl"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
          >
            {submitting ? 'Đang gửi...' : 'Gửi số công'}
          </Button>
        </div>
      )}
    </div>
  )
}
