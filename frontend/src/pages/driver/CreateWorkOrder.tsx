import { useState, useEffect, useCallback } from 'react'
import { Camera, RotateCcw, Plus, Trash2, AlertCircle, WifiOff, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui'
import { InlineSelect } from '@/components/shared/InlineSelect'
import { CreateClientDialog } from '@/components/shared/CreateClientDialog'
import { ContainerScanner } from '@/components/shared/ContainerScanner'
import type { PhotoMeta } from '@/components/shared/ContainerScanner'
import { apiClient } from '@/services/api'
import { useToast } from '@/components/atoms/Toast'
import { useOffline } from '@/contexts/OfflineContext'
import { WORK_TYPES, type Client, type RoutePrice, type WorkType, type ContainerItem } from '@/data/domain'

interface ContainerForm {
  containerNumber: string
  workType: WorkType
  photoTaken: boolean
  photoDataUrl?: string
  photoLat?: number | null
  photoLng?: number | null
  photoTimestamp?: string | null
  ocrLoading: boolean
  ocrError?: string
}

const EMPTY_CONT: ContainerForm = { containerNumber: '', workType: 'E20', photoTaken: false, ocrLoading: false }

export function CreateWorkOrder() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()
  const { isOnline } = useOffline()
  const [clients, setClients] = useState<Client[]>([])
  const [routes, setRoutes] = useState<RoutePrice[]>([])

  // Containers
  const [containers, setContainers] = useState<ContainerForm[]>([{ ...EMPTY_CONT }])

  // Common fields
  const [clientId, setClientId] = useState('')
  const [route, setRoute] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [createClientOpen, setCreateClientOpen] = useState(false)

  // Scanner state
  const [scannerOpen, setScannerOpen] = useState(false)
  const [activeContIdx, setActiveContIdx] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([apiClient.getClients(), apiClient.getRoutes()])
      .then(([cRes, rRes]) => {
        if (!cancelled) {
          if (cRes.success) setClients(cRes.data)
          if (rRes.success) setRoutes(rRes.data)
        }
      })
      .catch((err) => { console.error('Failed to load clients/routes:', err) })
    return () => { cancelled = true }
  }, [])

  // Handle scanner
  const openScanner = useCallback((idx: number) => () => {
    setActiveContIdx(idx)
    setScannerOpen(true)
  }, [])

  const handleScanComplete = useCallback((imageSrc: string, meta: PhotoMeta) => {
    const idx = activeContIdx
    setContainers(prev => prev.map((c, i) =>
      i === idx
        ? { ...c, photoTaken: true, photoDataUrl: imageSrc, photoLat: meta.lat, photoLng: meta.lng, photoTimestamp: meta.timestamp, ocrLoading: isOnline, ocrError: undefined }
        : c,
    ))
    setScannerOpen(false)

    if (!isOnline) return

    apiClient.ocrContainer(imageSrc, idx)
      .then((result) => {
        setContainers(prev => prev.map((c, i) => {
          if (i !== idx) return c
          if (result.success && result.containerNumber) {
            return { ...c, containerNumber: result.containerNumber, ocrLoading: false }
          }
          return { ...c, ocrLoading: false, ocrError: result.error ?? 'Không nhận diện được' }
        }))
      })
      .catch(() => {
        setContainers(prev => prev.map((c, i) =>
          i === idx ? { ...c, ocrLoading: false, ocrError: 'Lỗi kết nối AI' } : c,
        ))
      })
  }, [activeContIdx, isOnline])

  // Container management
  const updateContainer = useCallback((idx: number, field: keyof ContainerForm, value: string) => {
    setContainers(prev => prev.map((c, i) =>
      i === idx ? { ...c, [field]: value } : c,
    ))
  }, [])

  const addContainer = useCallback(() => {
    setContainers(prev => [...prev, { ...EMPTY_CONT }])
  }, [])

  const removeContainer = useCallback((idx: number) => {
    setContainers(prev => prev.filter((_, i) => i !== idx))
  }, [])

  // Get driver info from API for plate etc
  const [driverPlate, setDriverPlate] = useState('')
  useEffect(() => {
    apiClient.getDrivers()
      .then(res => {
        if (res.success) {
          const d = res.data.find((d: { id: number; tractorPlate?: string }) => d.id === Number(user!.id))
          if (d) setDriverPlate(d.tractorPlate ?? '')
        }
      })
      .catch((err) => { console.error('Failed to load driver info:', err) })
  }, [user])

  const handleSubmit = useCallback(async () => {
    if (containers.some(c => !c.containerNumber.trim()) || !clientId || !route) return
    setSubmitting(true)

    try {
      const client = clients.find(c => String(c.id) === clientId)
      const containerItems: ContainerItem[] = containers.map(c => ({
        containerNumber: c.containerNumber.trim(),
        workType: c.workType,
        photoUrl: c.photoDataUrl ?? '',
        photoLat: c.photoLat ?? null,
        photoLng: c.photoLng ?? null,
        photoTimestamp: c.photoTimestamp ?? null,
      }))

      const gps = await new Promise<{ lat: number; lng: number }>((resolve) => {
        if (!navigator.geolocation) return resolve({ lat: 0, lng: 0 })
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve({ lat: 0, lng: 0 }),
          { enableHighAccuracy: true, timeout: 5000 },
        )
      })

      const res = await apiClient.createWorkOrder({
        containers: containerItems,
        clientId: Number(clientId),
        clientName: client?.name ?? '',
        route,
        driverId: Number(user!.id),
        driverName: user!.name,
        tractorPlate: driverPlate,
        gpsLat: gps.lat,
        gpsLng: gps.lng,
      })

      navigate('/driver')
      if (!isOnline || res.data?.pendingSync) {
        toast.success('Đã lưu offline', 'Sẽ đồng bộ khi có mạng')
      } else {
        toast.success('Gửi chuyến thành công')
      }
    } catch (err) {
      console.error('Submit failed:', err)
      toast.error('Gửi thất bại', 'Vui lòng thử lại')
      setSubmitting(false)
    }
  }, [containers, clientId, route, clients, user, driverPlate, navigate, isOnline, toast])

  const canSubmit = containers.every(c => c.containerNumber.trim()) && clientId && route

  return (
    <div className="space-y-4 pb-6">
      {/* Offline hint */}
      {!isOnline && (
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ background: 'var(--theme-status-warning-light)', border: '1px solid var(--theme-status-warning)' }}
        >
          <WifiOff className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-status-warning)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--theme-status-warning)' }}>
            Không có mạng — nhập số cont thủ công
          </span>
        </div>
      )}

      {/* Scanner overlay */}
      {scannerOpen && (
        <ContainerScanner
          onCapture={handleScanComplete}
          onClose={() => setScannerOpen(false)}
        />
      )}

      {/* ── Container cards ── */}
      <div className="space-y-3">
        {containers.map((cont, idx) => (
          <div
            key={idx}
            className="rounded-2xl p-4 space-y-3"
            style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold" style={{ color: 'var(--theme-text-secondary)' }}>
                Cont {idx + 1}
              </span>
              {containers.length > 1 && (
                <button
                  onClick={() => removeContainer(idx)}
                  className="w-7 h-7 flex items-center justify-center rounded-full touch-manipulation"
                  style={{ background: 'var(--theme-status-error-light)' }}
                >
                  <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--theme-status-error)' }} />
                </button>
              )}
            </div>

            {/* Photo preview or camera trigger */}
            {cont.photoTaken && cont.photoDataUrl ? (
              <button
                onClick={openScanner(idx)}
                className="w-full rounded-xl overflow-hidden touch-manipulation"
                style={{ border: '2px solid var(--theme-brand-primary)' }}
              >
                <img
                  src={cont.photoDataUrl}
                  alt="Container"
                  className="w-full h-auto object-contain"
                  style={{ maxHeight: '120px' }}
                />
              </button>
            ) : (
            <button
              onClick={openScanner(idx)}
              className="w-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-6 px-4 transition-colors touch-manipulation"
              style={{
                background: 'transparent',
                borderColor: 'var(--theme-border-default)',
              }}
            >
              <div className="flex flex-col items-center gap-2 w-full">
                <div
                  className="w-full rounded-lg border-2 flex items-center justify-center px-2"
                  style={{
                    borderColor: 'var(--theme-brand-primary)',
                    opacity: 0.6,
                    minHeight: '48px',
                    background: 'var(--theme-brand-primary-light)',
                  }}
                >
                  <span className="text-xs font-bold uppercase tracking-wider text-center leading-tight" style={{ color: 'var(--theme-brand-primary)', opacity: 0.7 }}>
                    Căn số cont vào khung
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Camera className="w-5 h-5" style={{ color: 'var(--theme-text-muted)' }} />
                  <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Chạm để quét</span>
                </div>
              </div>
            </button>
            )}

            {/* Container number input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold" style={{ color: 'var(--theme-text-secondary)' }}>Số cont</label>
                {cont.photoTaken && (
                  <button
                    onClick={openScanner(idx)}
                    className="flex items-center gap-1 text-xs font-medium touch-manipulation"
                    style={{ color: 'var(--theme-text-muted)' }}
                  >
                    <RotateCcw className="w-3 h-3" /> Chụp lại
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  value={cont.containerNumber}
                  onChange={e => updateContainer(idx, 'containerNumber', e.target.value)}
                  className="w-full h-10 rounded-xl px-3 text-sm font-mono font-semibold"
                  style={{
                    background: 'var(--theme-bg-tertiary)',
                    border: '1px solid var(--theme-border-default)',
                    color: 'var(--theme-text-primary)',
                    paddingRight: cont.ocrLoading ? '40px' : undefined,
                  }}
                  placeholder={cont.ocrLoading ? 'Đang nhận diện...' : 'VD: MSKU-1234567'}
                  readOnly={cont.ocrLoading}
                />
                {cont.ocrLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" style={{ color: 'var(--theme-brand-primary)' }} />
                )}
              </div>
              <p className="text-xs flex items-center gap-1" style={{ color: cont.ocrError ? 'var(--theme-status-warning)' : 'var(--theme-text-muted)' }}>
                <AlertCircle className="w-3 h-3" />
                {cont.ocrError ?? (isOnline ? 'Sửa nếu PM nhận diện sai' : 'Nhập số cont thủ công')}
              </p>
            </div>

            {/* Type selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: 'var(--theme-text-secondary)' }}>Loại cont</label>
              <div className="grid grid-cols-4 gap-1.5">
                {WORK_TYPES.map(wt => (
                  <button
                    key={wt}
                    onClick={() => updateContainer(idx, 'workType', wt)}
                    className="py-2.5 rounded-lg text-xs font-bold transition-colors touch-manipulation"
                    style={{
                      background: cont.workType === wt ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)',
                      color: cont.workType === wt ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)',
                      border: `1px solid ${cont.workType === wt ? 'var(--theme-brand-primary)' : 'var(--theme-border-default)'}`,
                    }}
                  >
                    {wt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Add container button */}
        <button
          onClick={addContainer}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors touch-manipulation"
          style={{
            background: 'var(--theme-bg-secondary)',
            color: 'var(--theme-brand-primary)',
            border: '1px dashed var(--theme-brand-primary)',
          }}
        >
          <Plus className="w-4 h-4" />
          Thêm cont
        </button>
      </div>

      {/* ── Customer ── */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold" style={{ color: 'var(--theme-text-secondary)' }}>Khách hàng</label>
        <InlineSelect
          label="Chọn khách hàng"
          placeholder="Chọn khách hàng"
          value={clientId}
          options={clients.map(c => ({ value: String(c.id), label: c.code || c.name, sublabel: c.code ? c.name : c.phone }))}
          onChange={setClientId}
          onCreateNew={() => setCreateClientOpen(true)}
          createNewLabel="Tạo khách hàng mới"
        />
      </div>

      {/* ── Route ── */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold" style={{ color: 'var(--theme-text-secondary)' }}>Cung đường</label>
        <InlineSelect
          label="Chọn cung đường"
          placeholder="Chọn cung đường"
          value={route}
          options={routes.map((r) => ({ value: r.route, label: r.route }))}
          onChange={setRoute}
        />
      </div>

      {/* ── Submit ── */}
      <Button
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        className="w-full h-12 font-bold text-base rounded-2xl"
        style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
      >
        {submitting ? 'Đang gửi...' : isOnline ? 'Gửi chuyến' : 'Lưu offline'}
      </Button>

      <CreateClientDialog
        open={createClientOpen}
        onClose={() => setCreateClientOpen(false)}
        onConfirm={async (data) => {
          const res = await apiClient.createClient({ ...data, outstandingDebt: 0 })
          if (res.success) {
            setClients(prev => [...prev, res.data])
            setClientId(String(res.data.id))
          }
          setCreateClientOpen(false)
        }}
      />
    </div>
  )
}
