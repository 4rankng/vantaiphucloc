import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/services/api'
import { useLocations } from '@/hooks/use-queries'
import { useRecentValues } from '@/hooks/use-recent-values'
import type { PhotoMeta } from '@/components/shared/overlays/ContainerScanner'
import type { Client, ContType, WorkType, DeliveredTrip } from '@/data/domain'
import { CONT_TYPES } from '@/data/domain'
import { toISODate, shiftISODate, formatISODate } from '@/lib/salaryPeriod'
import { invalidateDeliveredTripDeps } from '@/hooks/query-keys'

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
  const qc = useQueryClient()
  const { user } = useAuth()
  const isEdit = !!existingDeliveredTrip

  // Reference data
  const [clients, setClients] = useState<Client[]>([])
  const [recentOrders, setRecentOrders] = useState<DeliveredTrip[]>([])
  const { data: locations = [] } = useLocations()

  // Recent vessel values (per-driver, stored in localStorage)
  const { recentValues: recentVessels, addRecent: addRecentVessel } = useRecentValues(
    `ttransport_recent_vessels_${user?.id ?? 'anon'}`
  )

  // Recent note values (per-driver, stored in localStorage)
  const { recentValues: recentNotes, addRecent: addRecentNote } = useRecentValues(
    `ttransport_recent_notes_${user?.id ?? 'anon'}`
  )

  // Form state — pre-populate from existing WO when editing
  const [containers, setContainers] = useState<ContainerForm[]>(
    existingDeliveredTrip ? woToContainers(existingDeliveredTrip) : [{ ...EMPTY_CONT }],
  )
  const [clientId, setClientId] = useState(existingDeliveredTrip ? String(existingDeliveredTrip.client.id) : '')
  const [vessel, setVessel] = useState(existingDeliveredTrip?.vessel ?? '')
  const [pickupLocation, setPickupLocation] = useState(existingDeliveredTrip?.pickupLocation.name ?? '')
  const [dropoffLocation, setDropoffLocation] = useState(existingDeliveredTrip?.dropoffLocation.name ?? '')
  const [tripDate, setTripDate] = useState<string>(
    existingDeliveredTrip?.tripDate
      ? existingDeliveredTrip.tripDate.slice(0, 10)
      : toISODate(new Date())
  )
  const [note, setNote] = useState(existingDeliveredTrip?.note ?? '')
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null)

  // UI state
  const [submitting, setSubmitting] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [activeContIdx, setActiveContIdx] = useState(0)
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
     
    setSuggestionLoading(true)

    const fetchSuggestions = async () => {
      const res = await apiClient.getSuggestedRoutes(undefined, undefined, 5)
      if (!cancelled && res.success) {
        setRecentOrders(res.data)
      }
      if (!cancelled) setSuggestionLoading(false)
    }

    fetchSuggestions().catch(() => {
      if (!cancelled) setSuggestionLoading(false)
    })

    return () => { cancelled = true }
  }, [user])

  // Shared photo from last scan — stored once, uploaded for first trip, URL shared to rest
  const lastScanPhotoRef = useRef<{ dataUrl: string; lat: number | null; lng: number | null; timestamp: string } | null>(null)

  // Scanner handlers
  const openScanner = useCallback((idx: number) => () => {
    setActiveContIdx(idx)
    setScannerOpen(true)
  }, [])

  const handleScanComplete = useCallback((imageSrc: string, meta: PhotoMeta) => {
    // Capture index immediately — activeContIdx may change by the time .then() fires
    const idx = activeContIdx
    setScannerOpen(false)

    // Store photo in ref (not per-container) for upload-once sharing
    lastScanPhotoRef.current = {
      dataUrl: imageSrc,
      lat: meta.lat,
      lng: meta.lng,
      timestamp: meta.timestamp,
    }

    // Set loading state on active container
    setContainers(prev => prev.map((c, i) =>
      i === idx ? { ...c, ocrLoading: true, ocrError: undefined, photoTaken: true, photoDataUrl: imageSrc } : c
    ))

    apiClient.ocrContainer(imageSrc, idx)
      .then((result) => {
        if (result.success && result.containerNumbers.length > 0) {
          setConsecutiveOCRFailures(0)
          const numbers = result.containerNumbers

          setContainers(prev => {
            // Inherit cont type + work type from the first container (or form defaults)
            const currentContType = prev[0]?.contType ?? null
            const currentWorkType = prev[0]?.workType ?? null

            // Deduplicate against existing container numbers
            const existingNumbers = new Set(
              prev.map(c => c.containerNumber.trim()).filter(Boolean)
            )
            const newNumbers = numbers.filter(n => !existingNumbers.has(n))

            // Map to ContainerForm — photo stored in ref, not per-container
            const newContainers: ContainerForm[] = newNumbers.map(n => ({
              containerNumber: n,
              contType: currentContType,
              workType: currentWorkType,
              photoTaken: false,
              ocrLoading: false,
            }))

            // Remove the placeholder container at [idx] if it was empty
            const activeEmpty = prev[idx]?.containerNumber.trim() === ''
            const filtered = activeEmpty
              ? prev.filter((_, i) => i !== idx)
              : prev

            return [...filtered, ...newContainers]
          })
        } else {
          // No containers detected — show error on the active slot
          setConsecutiveOCRFailures(prev => prev + 1)
          setContainers(prev => prev.map((c, i) =>
            i === idx
              ? { ...c, ocrLoading: false, ocrError: result.error ?? 'Không nhận diện được' }
              : c
          ))
        }
      })
      .catch(() => {
        setContainers(prev => prev.map((c, i) =>
          i === idx ? { ...c, ocrLoading: false, ocrError: 'Lỗi kết nối AI' } : c
        ))
      })
  }, [activeContIdx])

  // Container management
  const validateTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

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
  }, [applyValidationResult])

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

  // Shared cont type / work type — updates ALL containers at once
  const updateAllContType = useCallback((ct: ContType | null) => {
    setContainers(prev => prev.map(c => ({ ...c, contType: ct })))
  }, [])

  const updateAllWorkType = useCallback((wt: WorkType | null) => {
    setContainers(prev => prev.map(c => ({ ...c, workType: wt })))
  }, [])

  /** Open scanner targeting first empty container (or append a new one). */
  const scanNewContainer = useCallback(() => {
    const emptyIdx = containers.findIndex(c => !c.containerNumber.trim())
    if (emptyIdx >= 0) {
      setActiveContIdx(emptyIdx)
    } else {
      setContainers(prev => [...prev, { ...EMPTY_CONT }])
      setActiveContIdx(containers.length)
    }
    setScannerOpen(true)
  }, [containers])

  /** Commit a number as a new container badge (fills empty slot or appends). */
  const addContainerWithNumber = useCallback((number: string) => {
    setContainers(prev => {
      const contType = prev[0]?.contType ?? null
      const workType = prev[0]?.workType ?? null
      const emptyIdx = prev.findIndex(c => !c.containerNumber.trim())
      if (emptyIdx >= 0) {
        return prev.map((c, i) =>
          i === emptyIdx ? { ...c, containerNumber: number, contType, workType } : c
        )
      }
      return [...prev, { ...EMPTY_CONT, containerNumber: number, contType, workType }]
    })
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

  // Validation — photo is optional (scan-to-fill only, not stored)
  const canSubmit = useMemo(() => {
    const hasAtLeastOneContainer = containers.some(c => c.containerNumber.trim())
    return hasAtLeastOneContainer && !!clientId && !!pickupLocation && !!dropoffLocation
      && Object.keys(containerErrors).length === 0
  }, [containers, clientId, pickupLocation, dropoffLocation, containerErrors])

  const missingFields = useMemo(() => {
    const fields: string[] = []
    if (!containers.some(c => c.containerNumber.trim())) fields.push('số cont')
    if (!clientId) fields.push('khách hàng')
    if (!pickupLocation) fields.push('điểm đi')
    if (!dropoffLocation) fields.push('điểm đến')
    return fields
  }, [containers, clientId, pickupLocation, dropoffLocation])

  // Whether any container has a photo taken (for nudge UI)
  const hasAnyPhoto = useMemo(() =>
    containers.some(c => c.photoTaken),
    [containers],
  )

  // Number of non-empty containers (for summary / multi-trip display)
  const containerCount = useMemo(() =>
    containers.filter(c => c.containerNumber.trim()).length,
    [containers],
  )

  // Submit flow — confirmSubmit defined first so onRequestSubmit can call it directly in edit mode
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

      // Edit mode: single container only
      if (isEdit && existingDeliveredTrip) {
        const firstCont = containers[0]
        await apiClient.updateDeliveredTrip(existingDeliveredTrip.id, {
          contNumber: firstCont?.containerNumber.trim() || null,
          contType: firstCont?.contType ?? null,
          workType: firstCont?.workType ?? null,
          clientId: Number(clientId),
          pickupLocationId: pickupId,
          dropoffLocationId: dropoffId,
          vessel: vessel || null,
          vehiclePlate: null,
          tripDate,
          note: note.trim() || null,
        })
        // Upload photo if taken
        if (firstCont?.photoTaken && firstCont?.photoDataUrl) {
          apiClient.uploadDeliveredTripPhoto(existingDeliveredTrip.id, firstCont.photoDataUrl)
            .catch(() => {})
        }
        invalidateDeliveredTripDeps(qc)
        setShowSuccess(true)
        if (vessel.trim()) addRecentVessel(vessel.trim())
        if (note.trim()) addRecentNote(note.trim())
        setTimeout(() => {
          setShowSuccess(false)
          navigate('/driver')
        }, 1500)
        return
      }

      // Create mode: submit each container as a separate DeliveredTrip
      const activeContainers = containers.filter(c => c.containerNumber.trim())
      let anyFailed = false

      // Photo sharing: upload once for first trip, share URL to rest
      let sharedPhotoUrl: string | null = null
      const scanPhoto = lastScanPhotoRef.current

      for (let i = 0; i < activeContainers.length; i++) {
        const cont = activeContainers[i]
        try {
          // First trip + scan photo available: create trip, upload photo, capture URL
          if (i === 0 && scanPhoto) {
            const res = await apiClient.createDeliveredTrip({
              contNumber: cont.containerNumber.trim() || null,
              contType: cont.contType ?? null,
              workType: cont.workType ?? null,
              clientId: Number(clientId),
              pickupLocationId: pickupId,
              dropoffLocationId: dropoffId,
              driverId: Number(user!.id),
              vessel: vessel || null,
              vehiclePlate: null,
              tripDate,
              note: note.trim() || null,
            })

            if (!res.success) {
              anyFailed = true
              continue
            }

            // Upload photo for first trip → capture URL to share
            if (res.data?.id) {
              const uploadRes = await apiClient.uploadDeliveredTripPhoto(res.data.id, scanPhoto.dataUrl)
              if (uploadRes.success && uploadRes.data?.contPhotoUrl) {
                sharedPhotoUrl = uploadRes.data.contPhotoUrl
              }
            }
            continue
          }

          // Subsequent trips (or no scan photo): create with shared photo URL if available
          const res = await apiClient.createDeliveredTrip({
            contNumber: cont.containerNumber.trim() || null,
            contType: cont.contType ?? null,
            workType: cont.workType ?? null,
            contPhotoUrl: sharedPhotoUrl,
            clientId: Number(clientId),
            pickupLocationId: pickupId,
            dropoffLocationId: dropoffId,
            driverId: Number(user!.id),
            vessel: vessel || null,
            vehiclePlate: null,
            tripDate,
            note: note.trim() || null,
          })

          if (!res.success) {
            anyFailed = true
          }
        } catch {
          anyFailed = true
        }
      }

      invalidateDeliveredTripDeps(qc)
      setShowSuccess(true)
      if (vessel.trim()) addRecentVessel(vessel.trim())
      if (note.trim()) addRecentNote(note.trim())
      setTimeout(() => {
        setShowSuccess(false)
        navigate('/driver')
      }, anyFailed ? 3000 : 2000)
    } catch (err) {
      console.error('Submit failed:', err)
      setSubmitting(false)
    }
  }, [containers, qc, clientId, vessel, note, pickupLocation, dropoffLocation, locations, user, navigate, isEdit, existingDeliveredTrip, addRecentVessel, addRecentNote, tripDate])

  const onRequestSubmit = useCallback(async (): Promise<'validation-error' | undefined> => {
    if (!canSubmit) return
    // Validate container numbers via backend
    const errors: Record<number, string> = {}
    await Promise.all(containers.map(async (c, idx) => {
      try {
        const res = await apiClient.validateContainer(c.containerNumber.trim())
        if (!res.success || !res.data?.valid) {
          errors[idx] = res.data?.error ?? 'Số container không hợp lệ'
        }
      } catch { /* skip validation on error */ }
    }))
    setContainerErrors(errors)
    if (Object.keys(errors).length > 0) return
    // Edit mode: skip the summary dialog — driver already reviewed on the detail page
    if (isEdit) {
      await confirmSubmit()
    } else {
      setSummaryOpen(true)
    }
  }, [canSubmit, containers, isEdit, confirmSubmit])

  // Summary data for dialog — show all container numbers (comma separated)
  const summaryContNumber = useMemo(() => {
    const numbers = containers
      .map(c => c.containerNumber.trim())
      .filter(Boolean)
    return numbers.length > 0 ? numbers.join(', ') : null
  }, [containers])

  // Summary chip shows only the cont type (E20/E40/F20/F40).
  const summaryContType = useMemo(() => containers[0]?.contType ?? null, [containers])

  // Summary operation shown separately from contType.
  const summaryWorkType = useMemo(() => containers[0]?.workType ?? null, [containers])

  const summaryClientName = useMemo(() => {
    const client = clients.find(c => String(c.id) === clientId)
    return client?.code || client?.name || ''
  }, [clients, clientId])

  // ─── Original values for edit-mode "Trước:" hints ────────────────────────
  // Surface the saved trip's values so the form can show the driver what
  // they're changing. We resolve client name + date here so the view layer
  // doesn't have to repeat that lookup.
  const original = useMemo(() => {
    if (!existingDeliveredTrip) return null
    // Backward-compat: if workType holds a ContType value, treat it as contType.
    let contType: ContType | null = existingDeliveredTrip.contType ?? null
    let workType: WorkType | null = existingDeliveredTrip.workType ?? null
    if (!contType && workType && CONT_TYPE_SET.has(workType)) {
      contType = workType as ContType
      workType = null
    }
    const tripDateRaw = existingDeliveredTrip.tripDate ?? existingDeliveredTrip.createdAt
    return {
      contNumber: existingDeliveredTrip.contNumber ?? '',
      contType,
      workType,
      clientId: String(existingDeliveredTrip.client.id),
      clientName: existingDeliveredTrip.client.code || existingDeliveredTrip.client.name,
      vessel: existingDeliveredTrip.vessel ?? '',
      pickupLocation: existingDeliveredTrip.pickupLocation.name,
      dropoffLocation: existingDeliveredTrip.dropoffLocation.name,
      tripDateISO: tripDateRaw.slice(0, 10),
      tripDateLabel: formatISODate(tripDateRaw.slice(0, 10)),
      note: existingDeliveredTrip.note ?? '',
    }
  }, [existingDeliveredTrip])

  // ─── Return ───────────────────────────────────────────────────────────────
  return {
    // Mode
    isEdit,
    original,

    // Reference data
    clients, recentOrders,

    // Recent vessel suggestions (localStorage-backed)
    recentVessels,
    // Recent note suggestions (localStorage-backed)
    recentNotes,

    // Form state
    containers, clientId, vessel, note, pickupLocation, dropoffLocation, tripDate,
    selectedTripId,

    // UI state
    submitting, scannerOpen, summaryOpen, showSuccess,
    forceManualEntry, missingFields, containerErrors, containerSuggestions, suggestionLoading,

    // Derived
    canSubmit, summaryContNumber, summaryContType, summaryWorkType, summaryClientName,
    hasAnyPhoto, containerCount,
    tripDateLabel: formatISODate(tripDate),

    // Actions
    setClientId: (v: string) => { setSelectedTripId(null); setClientId(v) },
    setVessel,
    setNote,
    setPickupLocation: (v: string) => { setSelectedTripId(null); setPickupLocation(v) },
    setDropoffLocation: (v: string) => { setSelectedTripId(null); setDropoffLocation(v) },
    setTripDate,
    shiftTripDate: (days: number) => setTripDate(prev => shiftISODate(prev, days)),
    openScanner, handleScanComplete, setScannerOpen,
    updateContainer, addContainer, removeContainer, validateContainerOnBlur,
    applyContainerSuggestion,
    updateAllContType, updateAllWorkType, scanNewContainer,
    addContainerWithNumber,
    handleRecentTripSelect,
    onRequestSubmit, confirmSubmit,
    setSummaryOpen,
  }
}
