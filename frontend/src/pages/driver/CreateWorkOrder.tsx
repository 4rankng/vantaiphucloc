import { useState, useEffect, useCallback, useMemo } from 'react'
import { Camera, Check, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import { Label } from '@/components/ui/Label/Label'
import { apiClient } from '@/services/api'
import { useDriverStore } from '@/hooks/use-driver-store'
import { WORK_TYPES, type Client, type RoutePrice, type WorkType } from '@/data/mockData'

function generateWorkOrderNumber(): string {
  return 'CONG-' + String(Math.floor(Math.random() * 900000) + 100000)
}

export function CreateWorkOrder() {
  const { driver, navigate } = useDriverStore()
  const [clients, setClients] = useState<Client[]>([])
  const [routes, setRoutes] = useState<RoutePrice[]>([])
  const [photoTaken, setPhotoTaken] = useState(false)
  const [ocrNumber, setOcrNumber] = useState('')
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

  const handleTakePhoto = useCallback(() => {
    setPhotoTaken(true)
    setOcrNumber(generateWorkOrderNumber())
  }, [])

  const handleRetake = useCallback(() => {
    setPhotoTaken(false)
    setOcrNumber('')
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

  const canSubmit = ocrNumber.trim() && clientId && route

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold" style={{ color: 'var(--theme-text-primary)' }}>Chụp công</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>Chụp ảnh số công và điền thông tin</p>
      </div>

      {/* Camera simulation area */}
      <button
        onClick={handleTakePhoto}
        className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-colors touch-manipulation"
        style={{
          background: photoTaken ? 'var(--theme-bg-tertiary)' : 'var(--theme-bg-secondary)',
          borderColor: photoTaken ? 'var(--theme-brand-primary)' : 'var(--theme-border-default)',
        }}
        aria-label={photoTaken ? 'Chụp lại' : 'Chụp ảnh số công'}
      >
        {photoTaken ? (
          <>
            <div className="h-16 w-16 rounded-full flex items-center justify-center" style={{ background: 'var(--theme-brand-primary)' }}>
              <Check className="h-8 w-8" style={{ color: 'var(--theme-text-on-brand)' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Đã nhận diện: {ocrNumber}</p>
            <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Nhấn để chụp lại</p>
          </>
        ) : (
          <>
            <div className="h-16 w-16 rounded-full flex items-center justify-center" style={{ background: 'var(--theme-bg-tertiary)' }}>
              <Camera className="h-8 w-8" style={{ color: 'var(--theme-text-muted)' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Nhấn để chụp ảnh số công</p>
            <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>PM sẽ tự nhận diện số công</p>
          </>
        )}
      </button>

      {photoTaken && (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Số công</Label>
              <button onClick={handleRetake} className="text-xs font-medium flex items-center gap-1 touch-manipulation" style={{ color: 'var(--theme-brand-primary)' }}>
                <RotateCcw className="h-3 w-3" /> Chụp lại
              </button>
            </div>
            <Input value={ocrNumber} onChange={e => setOcrNumber(e.target.value)} className="text-sm font-mono" placeholder="Số công" />
            <p className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>Sửa nếu nhận diện không đúng</p>
          </div>

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
            <select value={clientId} onChange={e => setClientId(e.target.value)}
              className="w-full h-11 rounded-xl px-4 text-sm" style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)', color: 'var(--theme-text-primary)' }}>
              <option value="">Chọn khách hàng</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Cung đường</Label>
            <select value={route} onChange={e => setRoute(e.target.value)}
              className="w-full h-11 rounded-xl px-4 text-sm" style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)', color: 'var(--theme-text-primary)' }}>
              <option value="">Chọn cung đường</option>
              {routes.map((r, i) => <option key={i} value={r.route}>{r.route}</option>)}
            </select>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full h-12 font-bold text-base rounded-2xl"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
            {submitting ? 'Đang gửi...' : 'Gửi số công'}
          </Button>
        </>
      )}
    </div>
  )
}
