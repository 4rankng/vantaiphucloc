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

export function useCreateWorkOrder() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isOnline } = useOffline()

  // Reference data
  const [clients, setClients] = useState<Client[]>([])
  const [routes, setRoutes] = useState<RoutePrice[]>([])
  const [driverPlate, setDriverPlate] = useState('')
  const [recentOrders, setRecentOrders] = useState<WorkOrder[]>([])

  // Form state
  const [containers, setContainers] = useState<ContainerForm[]>([{ ...EMPTY_CONT }])
  const [clientId, setClientId] = useState('')
  const [pickupLocation, setPickupLocation] = useState('')
  const [dropoffLocation, setDropoffLocation] = useState('')

  // UI state
  const [submitting, setSubmitting] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [activeContIdx, setActiveContIdx] = useState(0)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [addMoreDismissed, setAddMoreDismissed] = useState(false)

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
            const key = `${wo.clientId}-${wo.route}`
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
  }, [])

  const addContainer = useCallback(() => {
    setContainers(prev => [...prev, { ...EMPTY_CONT }])
  }, [])

  const removeContainer = useCallback((idx: number) => {
    setContainers(prev => prev.filter((_, i) => i !== idx))
  }, [])

  // Recent trip selection
  const handleRecentTripSelect = useCallback((trip: { clientId: string; clientName: string; pickupLocation: string; dropoffLocation: string }) => {
    setClientId(trip.clientId)
    setPickupLocation(trip.pickupLocation)
    setDropoffLocation(trip.dropoffLocation)
  }, [])

  // Validation
  const canSubmit = useMemo(() =>
    containers.every(c => c.containerNumber.trim() && c.photoTaken) && !!clientId && !!pickupLocation && !!dropoffLocation,
    [containers, clientId, pickupLocation, dropoffLocation],
  )

  const missingFields = useMemo(() => {
    const fields: string[] = []
    if (containers.some(c => !c.containerNumber.trim())) fields.push('số cont')
    if (containers.some(c => !c.photoTaken)) fields.push('ảnh cont')
    if (!clientId) fields.push('khách hàng')
    if (!pickupLocation) fields.push('điểm lấy')
    if (!dropoffLocation) fields.push('điểm trả')
    return fields
  }, [containers, clientId, pickupLocation, dropoffLocation])

  // First container completion check
  const firstContComplete = useMemo(() => {
    const c = containers[0]
    return c && c.containerNumber.trim() && c.photoTaken
  }, [containers])

  const showAddMore = firstContComplete && containers.length < 2 && !addMoreDismissed

  // Submit flow
  const onRequestSubmit = useCallback(() => {
    if (!canSubmit) return
    setSummaryOpen(true)
  }, [canSubmit])

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

      const gps = await new Promise<{ lat: number; lng: number }>((resolve) => {
        if (!navigator.geolocation) return resolve({ lat: 0, lng: 0 })
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve({ lat: 0, lng: 0 }),
          { enableHighAccuracy: true, timeout: 5000 },
        )
      })

      const route = `${pickupLocation} - ${dropoffLocation}`

      const res = await apiClient.createWorkOrder({
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

      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
        navigate('/driver')
        if (!isOnline || res.data?.pendingSync) {
          // Will show toast from SuccessOverlay
        }
      }, 2000)
    } catch (err) {
      console.error('Submit failed:', err)
      setSubmitting(false)
    }
  }, [containers, clientId, pickupLocation, dropoffLocation, clients, user, driverPlate, navigate, isOnline])

  // Summary data for dialog
  const summaryContainers = useMemo(() =>
    containers.map(c => ({ number: c.containerNumber.trim(), type: c.workType })),
    [containers],
  )

  const summaryClientName = useMemo(() => {
    const client = clients.find(c => String(c.id) === clientId)
    return client?.name ?? ''
  }, [clients, clientId])

  return {
    // Reference data
    clients, routes, recentOrders,

    // Form state
    containers, clientId, pickupLocation, dropoffLocation,

    // UI state
    submitting, scannerOpen, isOnline, summaryOpen, showSuccess,
    showAddMore, forceManualEntry, missingFields,

    // Derived
    canSubmit, summaryContainers, summaryClientName,

    // Actions
    setClientId, setPickupLocation, setDropoffLocation,
    openScanner, handleScanComplete, setScannerOpen,
    updateContainer, addContainer, removeContainer,
    handleRecentTripSelect,
    onRequestSubmit, confirmSubmit,
    setSummaryOpen,
    dismissAddMore: useCallback(() => setAddMoreDismissed(true), []),
  }
}
