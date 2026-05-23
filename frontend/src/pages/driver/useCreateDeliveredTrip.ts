import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useOffline } from '@/contexts/OfflineContext'
import { apiClient } from '@/services/api'
import { useLocations } from '@/hooks/use-queries'
import type { PhotoMeta } from '@/components/shared/ContainerScanner'
import type { Client, WorkType, DeliveredTrip } from '@/data/domain'

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

/** Client-side ISO 6346 container number validation. Returns error message or null. */
function validateContainerFormat(num: string): string | null {
  const raw = num.replace(/-/g, '').toUpperCase().trim()
  if (!raw) return null
  if (raw.length < 11) return 'Cần 4 chữ cái + 7 số (vd: MSKU1234567)'
  if (raw.length > 11) return 'Quá dài — đúng 11 ký tự (4 chữ cái + 7 số)'
  if (!/^[A-Z]{4}\d{7}$/.test(raw)) return 'Sai định dạng. Đúng: 4 chữ cái + 7 số (vd: MSKU1234567)'
  return null
}

function woToContainers(wo: DeliveredTrip): ContainerForm[] {
  return [{
    containerNumber: wo.contNumber ?? '',
    workType: wo.contType ?? 'E20',
    photoTaken: false,
    ocrLoading: false,
  }]
}

export function useCreateDeliveredTrip(existingDeliveredTrip?: DeliveredTrip | null) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isOnline } = useOffline()
  const isEdit = !!existingDeliveredTrip

  // Reference data
  const [clients, setClients] = useState<Client[]>([])
  const [recentOrders, setRecentOrders] = useState<DeliveredTrip[]>([])
  const { data: locations = [] } = useLocations()

  // Form state — pre-populate from existing WO when editing
  const [containers, setContainers] = useState<ContainerForm[]>(
    existingDeliveredTrip ? woToContainers(existingDeliveredTrip) : [{ ...EMPTY_CONT }],
  )
  const [clientId, setClientId] = useState(existingDeliveredTrip ? String(existingDeliveredTrip.client.id) : '')
  const [vessel, setVessel] = useState(existingDeliveredTrip?.vessel ?? '')
  const [pickupLocation, setPickupLocation] = useState(existingDeliveredTrip?.pickupLocation.name ?? '')
  const [dropoffLocation, setDropoffLocation] = useState(existingDeliveredTrip?.dropoffLocation.name ?? '')
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null)

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
  const [suggestionLoading, setSuggestionLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([apiClient.getClients()])
      .then(([cRes]) => {
        if (!cancelled) {
          if (cRes.success) setClients(cRes.data)
        }
      })
      .catch((err) => { console.error('Failed to load clients:', err) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!user || user.role !== 'driver') return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSuggestionLoading(true)

    // Try to get GPS for proximity bonus
    const fetchWithGPS = async () => {
      let lat: number | undefined, lng: number | undefined
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) return reject(new Error('no geolocation'))
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false, timeout: 3000,
          })
        })
        lat = pos.coords.latitude
        lng = pos.coords.longitude
      } catch { /* GPS unavailable — still get suggestions without proximity */ }

      const res = await apiClient.getSuggestedRoutes(lat, lng, 5)
      if (!cancelled && res.success) {
        setRecentOrders(res.data)
      }
      if (!cancelled) setSuggestionLoading(false)
    }

    fetchWithGPS().catch(() => {
      if (!cancelled) setSuggestionLoading(false)
    })

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
  const validateTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  const updateContainer = useCallback((idx: number, field: keyof ContainerForm, value: string) => {
    // Normalize container numbers on input — strip hyphens, uppercase
    const normalizedValue = field === 'containerNumber'
      ? value.replace(/-/g, '').toUpperCase()
      : value
    setContainers(prev => prev.map((c, i) =>
      i === idx ? { ...c, [field]: normalizedValue } : c,
    ))
    if (field === 'containerNumber') {
      // Frontend format check — immediate
      const fmtErr = validateContainerFormat(normalizedValue)
      if (fmtErr) {
        setContainerErrors(prev => ({ ...prev, [idx]: fmtErr }))
        clearTimeout(validateTimers.current[idx])
        return
      }
      // Format OK — debounce backend ISO 6346 check (check digit)
      clearTimeout(validateTimers.current[idx])
      const raw = normalizedValue.trim()
      if (!raw || raw.length !== 11) {
        setContainerErrors(prev => { const next = { ...prev }; delete next[idx]; return next })
        return
      }
      validateTimers.current[idx] = setTimeout(() => {
        apiClient.validateContainer(raw).then(res => {
          setContainerErrors(prev => {
            if (!res.success || !res.data?.valid) {
              return { ...prev, [idx]: res.data?.error ?? 'Số container không hợp lệ' }
            }
            const next = { ...prev }; delete next[idx]; return next
          })
        }).catch(() => { /* ignore network errors here */ })
      }, 400)
    }
  }, [])

  const validateContainerOnBlur = useCallback((idx: number) => {
    const cont = containers[idx]
    if (!cont) return
    const raw = cont.containerNumber.trim()
    const fmtErr = validateContainerFormat(raw)
    if (fmtErr) {
      setContainerErrors(prev => ({ ...prev, [idx]: fmtErr }))
      clearTimeout(validateTimers.current[idx])
      return
    }
    if (!raw || raw.length !== 11) {
      setContainerErrors(prev => { const next = { ...prev }; delete next[idx]; return next })
      clearTimeout(validateTimers.current[idx])
      return
    }
    clearTimeout(validateTimers.current[idx])
    apiClient.validateContainer(raw).then(res => {
      setContainerErrors(prev => {
        if (!res.success || !res.data?.valid) {
          return { ...prev, [idx]: res.data?.error ?? 'Số container không hợp lệ' }
        }
        const next = { ...prev }; delete next[idx]; return next
      })
    }).catch(() => {})
  }, [containers])

  const addContainer = useCallback(() => {
    setContainers(prev => [...prev, { ...EMPTY_CONT }])
  }, [])

  const removeContainer = useCallback((idx: number) => {
    setContainers(prev => prev.filter((_, i) => i !== idx))
  }, [])

  // Suggestion selection (toggle: click again to deselect)
  const handleRecentTripSelect = useCallback((trip: {
    tripId?: number | string
    clientId: string
    clientName: string
    pickupLocation: string
    dropoffLocation: string
  }) => {
    if (selectedTripId === trip.tripId) {
      setSelectedTripId(null)
      setClientId('')
      setPickupLocation('')
      setDropoffLocation('')
    } else {
      setSelectedTripId(trip.tripId ?? null)
      setClientId(trip.clientId)
      setPickupLocation(trip.pickupLocation)
      setDropoffLocation(trip.dropoffLocation)
    }
  }, [selectedTripId])

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
      const pickupId = locations.find(l => l.name === pickupLocation)?.id
      const dropoffId = locations.find(l => l.name === dropoffLocation)?.id
      if (!pickupId || !dropoffId) {
        setSubmitting(false)
        return
      }

      if (isEdit && existingDeliveredTrip) {
        await apiClient.updateDeliveredTrip(existingDeliveredTrip.id, {
          contNumber: containers[0]?.containerNumber.trim() || null,
          contType: containers[0]?.workType ?? null,
          clientId: Number(clientId),
          pickupLocationId: pickupId,
          dropoffLocationId: dropoffId,
          vessel: vessel || null,
        })
      } else {
        await apiClient.createDeliveredTrip({
          contNumber: containers[0]?.containerNumber.trim() || null,
          contType: containers[0]?.workType ?? null,
          clientId: Number(clientId),
          pickupLocationId: pickupId,
          dropoffLocationId: dropoffId,
          driverId: Number(user!.id),
          vessel: vessel || null,
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
  }, [containers, clientId, vessel, pickupLocation, dropoffLocation, locations, user, navigate, isEdit, existingDeliveredTrip])

  // Summary data for dialog
  const summaryContNumber = useMemo(() =>
    containers[0]?.containerNumber.trim() || null,
    [containers],
  )

  const summaryContType = useMemo(() =>
    containers[0]?.workType ?? null,
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
    clients, recentOrders,

    // Form state
    containers, clientId, vessel, pickupLocation, dropoffLocation,
    selectedTripId,

    // UI state
    submitting, scannerOpen, galleryImage, isOnline, summaryOpen, showSuccess,
    forceManualEntry, missingFields, containerErrors, suggestionLoading,

    // Derived
    canSubmit, summaryContNumber, summaryContType, summaryClientName,

    // Actions
    setClientId: (v: string) => { setSelectedTripId(null); setClientId(v) },
    setVessel,
    setPickupLocation: (v: string) => { setSelectedTripId(null); setPickupLocation(v) },
    setDropoffLocation: (v: string) => { setSelectedTripId(null); setDropoffLocation(v) },
    openScanner, openGallery, handleScanComplete, setScannerOpen,
    updateContainer, addContainer, removeContainer, validateContainerOnBlur,
    handleRecentTripSelect,
    onRequestSubmit, confirmSubmit,
    setSummaryOpen,
  }
}
