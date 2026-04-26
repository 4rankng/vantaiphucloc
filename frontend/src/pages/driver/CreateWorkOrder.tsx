import { useState, useEffect, useCallback } from 'react'
import { Camera, Check, RotateCcw, MapPin, Lock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import { Label } from '@/components/ui/Label/Label'
import { apiClient } from '@/services/api'
import { useDriverStore } from '@/hooks/use-driver-store'
import { WORK_TYPES, type Client, type RoutePrice, type WorkType } from '@/data/mockData'

interface GpsCoords {
  lat: number
  lng: number
  accuracy: number
}

function generateContainerNumber(): string {
  const prefixes = ['MSKU', 'TCNU', 'HLCU', 'CSLU', 'TEMU']
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
  const num = String(Math.floor(Math.random() * 9000000) + 1000000)
  return `${prefix}-${num}`
}

export function CreateWorkOrder() {
  const { driver, navigate } = useDriverStore()
  const [clients, setClients] = useState<Client[]>([])
  const [routes, setRoutes] = useState<RoutePrice[]>([])

  // Step 1: Container photo + OCR
  const [containerPhotoTaken, setContainerPhotoTaken] = useState(false)
  const [ocrNumber, setOcrNumber] = useState('')

  // Step 2: Seal photo
  const [sealPhotoTaken, setSealPhotoTaken] = useState(false)

  // Step 3: GPS
  const [gps, setGps] = useState<GpsCoords | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState('')

  // Form fields
  const [workType, setWorkType] = useState<WorkType>('E20')
  const [clientId, setClientId] = useState('')
  const [route, setRoute] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
    setOcrNumber(generateContainerNumber())
  }, [])

  const handleRetakeContainer = useCallback(() => {
    setContainerPhotoTaken(false)
    setOcrNumber('')
  }, [])

  const handleTakeSealPhoto = useCallback(() => {
    setSealPhotoTaken(true)
  }, [])

  const handleGetGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Thiết bị không hỗ trợ GPS')
      return
    }
    setGpsLoading(true)
    setGpsError('')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy })
        setGpsLoading(false)
      },
      () => {
        // Simulate GPS for demo
        setGps({ lat: 20.8449, lng: 106.6881, accuracy: 15 })
        setGpsLoading(false)
      },
      { timeout: 8000, enableHighAccuracy: true },
    )
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!ocrNumber.trim() || !clientId || !route) return
    setSubmitting(true)
    const client = clients.find(c => c.id === clientId)
    await apiClient.createWorkOrder({
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
    navigate('/driver')
  }, [ocrNumber, clientId, route, workType, clients, driver, navigate])

  const canSubmit = ocrNumber.trim() && clientId && route && sealPhotoTaken && gps

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold" style={{ color: 'var(--theme-text-primary)' }}>Tạo số công</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>Chụp ảnh và điền thông tin chuyến</p>
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
                <p className="text-sm font-bold font-mono" style={{ color: 'var(--theme-text-primary)' }}>{ocrNumber}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>AI đã nhận diện · Nhấn để chụp lại</p>
              </div>
            </>
          ) : (
            <>
              <div className="h-14 w-14 rounded-full flex items-center justify-center" style={{ background: 'var(--theme-bg-tertiary)' }}>
                <Camera className="h-7 w-7" style={{ color: 'var(--theme-text-muted)' }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Chụp ảnh số công-ten-nơ</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>AI sẽ tự nhận diện số công</p>
              </div>
            </>
          )}
        </button>

        {containerPhotoTaken && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Số công</Label>
              <button onClick={handleRetakeContainer} className="text-xs font-medium flex items-center gap-1 touch-manipulation" style={{ color: 'var(--theme-brand-primary)' }}>
                <RotateCcw className="h-3 w-3" /> Chụp lại
              </button>
            </div>
            <Input
              value={ocrNumber}
              onChange={e => setOcrNumber(e.target.value)}
              className="text-sm font-mono"
              placeholder="Số công"
            />
            <p className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>
              Kiểm tra và sửa nếu nhận diện không đúng
            </p>
          </div>
        )}
      </div>

      {containerPhotoTaken && (
        <>
          {/* ── STEP 2: Seal photo ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: sealPhotoTaken ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)', color: sealPhotoTaken ? 'var(--theme-text-on-brand)' : 'var(--theme-text-muted)' }}
              >
                2
              </div>
              <span className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Chụp ảnh seal công</span>
            </div>

            <button
              onClick={handleTakeSealPhoto}
              className="w-full py-4 rounded-2xl border-2 border-dashed flex items-center justify-center gap-3 transition-colors touch-manipulation"
              style={{
                background: sealPhotoTaken ? 'var(--theme-bg-tertiary)' : 'var(--theme-bg-secondary)',
                borderColor: sealPhotoTaken ? 'var(--theme-brand-primary)' : 'var(--theme-border-default)',
              }}
              aria-label="Chụp ảnh seal"
            >
              {sealPhotoTaken ? (
                <>
                  <Check className="h-5 w-5" style={{ color: 'var(--theme-brand-primary)' }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--theme-brand-primary)' }}>Đã chụp ảnh seal</span>
                </>
              ) : (
                <>
                  <Lock className="h-5 w-5" style={{ color: 'var(--theme-text-muted)' }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Chụp ảnh seal công</span>
                </>
              )}
            </button>
          </div>

          {/* ── STEP 3: GPS ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: gps ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)', color: gps ? 'var(--theme-text-on-brand)' : 'var(--theme-text-muted)' }}
              >
                3
              </div>
              <span className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Xác nhận vị trí GPS</span>
            </div>

            {gps ? (
              <div
                className="flex items-center gap-3 p-3 rounded-2xl"
                style={{ background: 'var(--theme-status-success-light)' }}
              >
                <MapPin className="h-5 w-5 shrink-0" style={{ color: 'var(--theme-status-success)' }} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold" style={{ color: 'var(--theme-status-success-text)' }}>
                    Đã lấy vị trí GPS
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--theme-status-success-text)', opacity: 0.8 }}>
                    {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)} · Độ chính xác: {Math.round(gps.accuracy)}m
                  </p>
                </div>
                <button onClick={handleGetGps} className="text-xs font-medium shrink-0 touch-manipulation" style={{ color: 'var(--theme-status-success-text)' }}>
                  Lấy lại
                </button>
              </div>
            ) : (
              <button
                onClick={handleGetGps}
                disabled={gpsLoading}
                className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold transition-all active:scale-[0.98] touch-manipulation"
                style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)', color: 'var(--theme-text-primary)' }}
              >
                <MapPin className="h-4 w-4" style={{ color: 'var(--theme-brand-primary)' }} />
                {gpsLoading ? 'Đang lấy vị trí...' : 'Lấy vị trí GPS'}
              </button>
            )}

            {gpsError && (
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--theme-status-error)' }}>
                <AlertCircle className="h-3.5 w-3.5" />
                {gpsError}
              </div>
            )}
          </div>

          {/* ── Form fields ── */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Loại công</Label>
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

          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Khách hàng</Label>
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

          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Cung đường</Label>
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

          {/* Driver info (auto-filled) */}
          <div
            className="p-3 rounded-xl space-y-1"
            style={{ background: 'var(--theme-bg-tertiary)' }}
          >
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

          {!canSubmit && (
            <p className="text-xs text-center" style={{ color: 'var(--theme-text-muted)' }}>
              Cần chụp ảnh seal và lấy GPS trước khi gửi
            </p>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full h-12 font-bold text-base rounded-2xl"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
          >
            {submitting ? 'Đang gửi...' : 'Gửi lệnh'}
          </Button>
        </>
      )}
    </div>
  )
}
