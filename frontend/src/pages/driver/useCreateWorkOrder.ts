import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useOffline } from '@/contexts/OfflineContext'
import { apiClient } from '@/services/api'
import type { PhotoMeta } from '@/components/shared/ContainerScanner'
import type { Client, RoutePrice, WorkType, WorkOrder } from '@/data/domain'

export interface ContainerForm {
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

function woToContainers(wo: WorkOrder): ContainerForm[] {
  return wo.containers.map(c => ({
    containerNumber: c.containerNumber,
    workType: c.workType,
    photoTaken: !!c.photoUrl,
    photoDataUrl: c.photoUrl || undefined,
    photoLat: c.photoLat,
    photoLng: c.photoLng,
    photoTimestamp: c.photoTimestamp,
    ocrLoading: false,
  }))
}

export function useCreateWorkOrder(existingWorkOrder?: WorkOrder | null) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isOnline } = useOffline()
  const isEdit = !!existingWorkOrder

  // Reference data
  const [clients, setClients] = useState<Client[]>([])
  const [routes, setRoutes] = useState<RoutePrice[]>([])
  const [driverPlate, setDriverPlate] = useState('')
  const [recentOrders, setRecentOrders] = useState<WorkOrder[]>([])

  // Form state — pre-populate from existing WO when editing
  const [containers, setContainers] = useState<ContainerForm[]>(
    existingWorkOrder ? woToContainers(existingWorkOrder) : [{ ...EMPTY_CONT }],
  )
  const [clientId, setClientId] = useState(existingWorkOrder ? String(existingWorkOrder.clientId) : '')
  const [pickupLocation, setPickupLocation] = useState(existingWorkOrder?.pickupLocation ?? '')
  const [dropoffLocation, setDropoffLocation] = useState(existingWorkOrder?.dropoffLocation ?? '')

  // UI state
  const [submitting, setSubmitting] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [activeContIdx, setActiveContIdx] = useState(0)
  const [galleryImage, setGalleryImage] = useState<string | null>(null)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [containerErrors, setContainerErrors] = useState<Record<number, string>>({})

  // Consecutive OCR failure tracking
  const [consecutiveOCRFailures, setConsecutiveOCRFailures] = useState(0)
  const forceManualEntry = consecutiveOCRFailures >= 2

  // Load reference data
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

  // Load driver plate
  useEffect(() => {
    if (!user) return
    let cancelled = false
    apiClient.getDrivers()
      .then(res => {
        if (!cancelled && res.success) {
          const d = res.data.find((d: { id: number; tractorPlate?: string }) => d.id === Number(user.id))
          if (d) setDriverPlate(d.tractorPlate ?? '')
        }
      })
      .catch((err) => { console.error('Failed to load driver info:', err) })
    return () => { cancelled = true }
  }, [user])

  // Load recent orders for suggestions
  useEffect(() => {
    if (!user) return
    let cancelled = false
    apiClient.getWorkOrders({ driverId: user.id })
      .then(res => {
        if (!cancelled && res.success) {
          const sorted = [...res.data].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          const seen = new Set<string>()
          const unique: WorkOrder[] = []
          for (const wo of sorted) {
            const key = `${wo.clientId}-${wo.pickupLocation}-${wo.dropoffLocation}`
            if (!seen.has(key)) {
              seen.add(key)
              unique.push(wo)
              if (unique.length >= 5) break
            }
          }
          setRecentOrders(unique)
        }
      })
      .catch((err) => { console.error('Failed to load recent orders:', err) })
    return () => { cancelled = true }
  }, [user])

  // Scanner handlers
  const openScanner = useCallback((idx: number) => () => {
    setActiveContIdx(idx)
    setGalleryImage(null)
    setScannerOpen(true)
  }, [])

  const openGallery = useCallback((idx: number, dataUrl: string) => {
    setActiveContIdx(idx)
    setGalleryImage(dataUrl)
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
    setGalleryImage(null)

    if (!isOnline) return

    apiClient.ocrContainer(imageSrc, idx)
      .then((result) => {
        setContainers(prev => prev.map((c, i) => {
          if (i !== idx) return c
          if (result.success && result.containerNumber) {
            setConsecutiveOCRFailures(0)
            return { ...c, containerNumber: result.containerNumber, ocrLoading: false }
          }
          setConsecutiveOCRFailures(prev => prev + 1)
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
    if (field === 'containerNumber') {
      setContainerErrors(prev => { const next = { ...prev }; delete next[idx]; return next })
    }
  }, [])

  const addContainer = useCallback(() => {
    setContainers(prev => [...prev, { ...EMPTY_CONT }])
  }, [])

  const removeContainer = useCallback((idx: number) => {
    setContainers(prev => prev.filter((_, i) => i !== idx))
  }, [])

  // Recent trip selection (toggle: click again to deselect)
  const handleRecentTripSelect = useCallback((trip: { clientId: string; clientName: string; pickupLocation: string; dropoffLocation: string }) => {
    if (clientId === trip.clientId && pickupLocation === trip.pickupLocation && dropoffLocation === trip.dropoffLocation) {
      setClientId('')
      setPickupLocation('')
      setDropoffLocation('')
    } else {
      setClientId(trip.clientId)
      setPickupLocation(trip.pickupLocation)
      setDropoffLocation(trip.dropoffLocation)
    }
  }, [clientId, pickupLocation, dropoffLocation])

  // Validation — for edit mode, existing photos are valid
  const canSubmit = useMemo(() => {
    const hasContainerInfo = containers.every(c => c.containerNumber.trim() && c.photoTaken)
    return hasContainerInfo && !!clientId && !!pickupLocation && !!dropoffLocation
      && Object.keys(containerErrors).length === 0
  }, [containers, clientId, pickupLocation, dropoffLocation, containerErrors])

  const missingFields = useMemo(() => {
    const fields: string[] = []
    if (containers.some(c => !c.containerNumber.trim())) fields.push('số cont')
    if (containers.some(c => !c.photoTaken)) fields.push('ảnh cont')
    if (!clientId) fields.push('khách hàng')
    if (!pickupLocation) fields.push('điểm lấy')
    if (!dropoffLocation) fields.push('điểm trả')
    return fields
  }, [containers, clientId, pickupLocation, dropoffLocation])

  // Submit flow
  const onRequestSubmit = useCallback(async () => {
    if (!canSubmit) return
    // Validate container numbers via backend
    const errors: Record<number, string> = {}
    const isOnlineFlag = navigator.onLine
    if (isOnlineFlag) {
      await Promise.all(containers.map(async (c, idx) => {
        try {
          const res = await apiClient.validateContainer(c.containerNumber.trim())
          if (!res.success || !res.data?.valid) {
            errors[idx] = res.data?.error ?? 'Số container không hợp lệ'
          }
        } catch { /* skip validation on error */ }
      }))
    }
    setContainerErrors(errors)
    if (Object.keys(errors).length > 0) return
    setSummaryOpen(true)
  }, [canSubmit, containers])

  const confirmSubmit = useCallback(async () => {
    setSummaryOpen(false)
    setSubmitting(true)

    try {
      const client = clients.find(c => String(c.id) === clientId)
      const containerItems = containers.map(c => ({
        containerNumber: c.containerNumber.trim(),
        workType: c.workType,
        photoUrl: c.photoDataUrl ?? '',
        photoLat: c.photoLat ?? null,
        photoLng: c.photoLng ?? null,
        photoTimestamp: c.photoTimestamp ?? null,
      }))

      const route = `${pickupLocation} - ${dropoffLocation}`

      if (isEdit && existingWorkOrder) {
        await apiClient.updateWorkOrder(existingWorkOrder.id, {
          containers: containerItems,
          clientId: Number(clientId),
          clientName: client?.name ?? '',
          route,
          pickupLocation,
          dropoffLocation,
        })
      } else {
        const gps = await new Promise<{ lat: number; lng: number }>((resolve) => {
          if (!navigator.geolocation) return resolve({ lat: 0, lng: 0 })
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => resolve({ lat: 0, lng: 0 }),
            { enableHighAccuracy: true, timeout: 5000 },
          )
        })

        await apiClient.createWorkOrder({
          containers: containerItems,
          clientId: Number(clientId),
          clientName: client?.name ?? '',
          route,
          pickupLocation,
          dropoffLocation,
          driverId: Number(user!.id),
          driverName: user!.name,
          tractorPlate: driverPlate,
          gpsLat: gps.lat,
          gpsLng: gps.lng,
        })
      }

      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
        navigate('/driver')
      }, 2000)
    } catch (err) {
      console.error('Submit failed:', err)
      setSubmitting(false)
    }
  }, [containers, clientId, pickupLocation, dropoffLocation, clients, user, driverPlate, navigate, isOnline, isEdit, existingWorkOrder])

  // Summary data for dialog
  const summaryContainers = useMemo(() =>
    containers.map(c => ({ number: c.containerNumber.trim(), type: c.workType })),
    [containers],
  )

  const summaryClientName = useMemo(() => {
    const client = clients.find(c => String(c.id) === clientId)
    return client?.name ?? ''
  }, [clients, clientId])

  // ─── Return ───────────────────────────────────────────────────────────────
  return {
    // Mode
    isEdit,

    // Reference data
    clients, routes, recentOrders,

    // Form state
    containers, clientId, pickupLocation, dropoffLocation,

    // UI state
    submitting, scannerOpen, galleryImage, isOnline, summaryOpen, showSuccess,
    forceManualEntry, missingFields, containerErrors,

    // Derived
    canSubmit, summaryContainers, summaryClientName,

    // Actions
    setClientId, setPickupLocation, setDropoffLocation,
    openScanner, openGallery, handleScanComplete, setScannerOpen,
    updateContainer, addContainer, removeContainer,
    handleRecentTripSelect,
    onRequestSubmit, confirmSubmit,
    setSummaryOpen,
  }
}
