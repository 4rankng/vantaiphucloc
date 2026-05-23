import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useOffline } from '@/contexts/OfflineContext'
import { apiClient } from '@/services/api'
import { useLocations } from '@/hooks/use-queries'
import type { PhotoMeta } from '@/components/shared/ContainerScanner'
import type { Client, ContType, WorkType, DeliveredTrip } from '@/data/domain'
import { CONT_TYPES } from '@/data/domain'

/**
 * ContainerForm — per-container row of the create-trip form.
 *
 * `contType` and `workType` are independent:
 *   - contType: ContType ('E20' | 'E40' | 'F20' | 'F40') — the physical container.
 *   - workType: operation performed (e.g. 'CHẠY SÀ LAN', 'ĐÓNG KHO', or a free-text custom value).
 *
 * Either may be empty (null). Both are written to the API as separate columns.
 */
export interface ContainerForm {
  containerNumber: string
  contType: ContType | null
  workType: WorkType | null
  photoTaken: boolean
  photoDataUrl?: string
  photoLat?: number | null
  photoLng?: number | null
  photoTimestamp?: string | null
  ocrLoading: boolean
  ocrError?: string
}

const EMPTY_CONT: ContainerForm = {
  containerNumber: '',
  contType: null,
  workType: null,
  photoTaken: false,
  ocrLoading: false,
}

const CONT_TYPE_SET: ReadonlySet<string> = new Set(CONT_TYPES)

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
  // Edit mode: pre-populate both contType and workType from the saved trip.
  // Backward-compat: if workType was historically used to hold a ContType, treat
  // it as the contType instead so users don't see a duplicate selection.
  let contType: ContType | null = wo.contType ?? null
  let workType: WorkType | null = wo.workType ?? null
  if (!contType && workType && CONT_TYPE_SET.has(workType)) {
    contType = workType as ContType
    workType = null
  }
  return [{
    containerNumber: wo.contNumber ?? '',
    contType,
    workType,
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
  // Per-container check-digit correction suggestions returned by the backend.
  // Only populated when format is right but check digit is wrong.
  const [containerSuggestions, setContainerSuggestions] = useState<Record<number, string[]>>({})

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

  const updateContainer = useCallback(<K extends keyof ContainerForm>(
    idx: number,
    field: K,
    value: ContainerForm[K],
  ) => {
    // Normalize container numbers on input — strip hyphens, uppercase
    const normalizedValue: ContainerForm[K] = field === 'containerNumber' && typeof value === 'string'
      ? (value.replace(/-/g, '').toUpperCase() as ContainerForm[K])
      : value
    setContainers(prev => prev.map((c, i) =>
      i === idx ? { ...c, [field]: normalizedValue } : c,
    ))
    if (field === 'containerNumber') {
      const numStr = normalizedValue as string
      // Any edit invalidates the previous suggestions — they were for the old value.
      setContainerSuggestions(prev => {
        if (!(idx in prev)) return prev
        const next = { ...prev }; delete next[idx]; return next
      })
      // Frontend format check — immediate
      const fmtErr = validateContainerFormat(numStr)
      if (fmtErr) {
        setContainerErrors(prev => ({ ...prev, [idx]: fmtErr }))
        clearTimeout(validateTimers.current[idx])
        return
      }
      // Format OK — debounce backend ISO 6346 check (check digit)
      clearTimeout(validateTimers.current[idx])
      const raw = numStr.trim()
      if (!raw || raw.length !== 11) {
        setContainerErrors(prev => { const next = { ...prev }; delete next[idx]; return next })
        return
      }
      validateTimers.current[idx] = setTimeout(() => {
        apiClient.validateContainer(raw).then(res => {
          applyValidationResult(idx, res)
        }).catch(() => { /* ignore network errors here */ })
      }, 400)
    }
  }, [])

  /** Apply the validate-container response to error + suggestion state for one row. */
  const applyValidationResult = useCallback((
    idx: number,
    res: Awaited<ReturnType<typeof apiClient.validateContainer>>,
  ) => {
    const invalid = !res.success || !res.data?.valid
    setContainerErrors(prev => {
      if (invalid) return { ...prev, [idx]: res.data?.error ?? 'Số container không hợp lệ' }
      const next = { ...prev }; delete next[idx]; return next
    })
    setContainerSuggestions(prev => {
      const list = invalid ? (res.data?.suggestions ?? []) : []
      if (list.length === 0) {
        if (!(idx in prev)) return prev
        const next = { ...prev }; delete next[idx]; return next
      }
      return { ...prev, [idx]: list }
    })
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
      applyValidationResult(idx, res)
    }).catch(() => {})
  }, [containers, applyValidationResult])

  const addContainer = useCallback(() => {
    setContainers(prev => [...prev, { ...EMPTY_CONT }])
  }, [])

  const removeContainer = useCallback((idx: number) => {
    setContainers(prev => prev.filter((_, i) => i !== idx))
    // Re-key the error + suggestion maps to match the new indices.
    const reindex = <V,>(map: Record<number, V>): Record<number, V> => {
      const next: Record<number, V> = {}
      Object.entries(map).forEach(([k, v]) => {
        const oldIdx = Number(k)
        if (oldIdx === idx) return
        next[oldIdx > idx ? oldIdx - 1 : oldIdx] = v
      })
      return next
    }
    setContainerErrors(prev => reindex(prev))
    setContainerSuggestions(prev => reindex(prev))
  }, [])

  /**
   * Apply a server-suggested correction to a container number. Auto-runs
   * validation so the error message + suggestion chips clear on success.
   */
  const applyContainerSuggestion = useCallback((idx: number, suggestion: string) => {
    setContainers(prev => prev.map((c, i) =>
      i === idx ? { ...c, containerNumber: suggestion } : c,
    ))
    // Clear the stale suggestions immediately; the validate call will repopulate
    // them only if (somehow) the suggested value is also invalid.
    setContainerSuggestions(prev => {
      if (!(idx in prev)) return prev
      const next = { ...prev }; delete next[idx]; return next
    })
    clearTimeout(validateTimers.current[idx])
    apiClient.validateContainer(suggestion).then(res => {
      applyValidationResult(idx, res)
    }).catch(() => {})
  }, [applyValidationResult])

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

  // Validation — photo is optional (scan-to-fill only, not stored)
  const canSubmit = useMemo(() => {
    const hasContainerInfo = containers.every(c => c.containerNumber.trim())
    return hasContainerInfo && !!clientId && !!pickupLocation && !!dropoffLocation
      && Object.keys(containerErrors).length === 0
  }, [containers, clientId, pickupLocation, dropoffLocation, containerErrors])

  const missingFields = useMemo(() => {
    const fields: string[] = []
    if (containers.some(c => !c.containerNumber.trim())) fields.push('số cont')
    if (!clientId) fields.push('khách hàng')
    if (!pickupLocation) fields.push('điểm đi')
    if (!dropoffLocation) fields.push('điểm đến')
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

      const firstCont = containers[0]
      if (isEdit && existingDeliveredTrip) {
        await apiClient.updateDeliveredTrip(existingDeliveredTrip.id, {
          contNumber: firstCont?.containerNumber.trim() || null,
          contType: firstCont?.contType ?? null,
          workType: firstCont?.workType ?? null,
          clientId: Number(clientId),
          pickupLocationId: pickupId,
          dropoffLocationId: dropoffId,
          vessel: vessel || null,
        })
      } else {
        await apiClient.createDeliveredTrip({
          contNumber: firstCont?.containerNumber.trim() || null,
          contType: firstCont?.contType ?? null,
          workType: firstCont?.workType ?? null,
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

  // Summary chip shows the cont type when set, else the operation, else null.
  const summaryContType = useMemo(() => {
    const c = containers[0]
    return c?.contType ?? c?.workType ?? null
  }, [containers])

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
    forceManualEntry, missingFields, containerErrors, containerSuggestions, suggestionLoading,

    // Derived
    canSubmit, summaryContNumber, summaryContType, summaryClientName,

    // Actions
    setClientId: (v: string) => { setSelectedTripId(null); setClientId(v) },
    setVessel,
    setPickupLocation: (v: string) => { setSelectedTripId(null); setPickupLocation(v) },
    setDropoffLocation: (v: string) => { setSelectedTripId(null); setDropoffLocation(v) },
    openScanner, openGallery, handleScanComplete, setScannerOpen,
    updateContainer, addContainer, removeContainer, validateContainerOnBlur,
    applyContainerSuggestion,
    handleRecentTripSelect,
    onRequestSubmit, confirmSubmit,
    setSummaryOpen,
  }
}
