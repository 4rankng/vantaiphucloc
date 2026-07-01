import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/services/api'
import { useLocations } from '@/hooks/use-queries'
import { useRecentValues } from '@/hooks/use-recent-values'
import type { Client, DeliveredTrip } from '@/data/domain'
import { toISODate, shiftISODate, formatISODate } from '@/lib/salaryPeriod'
import { invalidateDeliveredTripDeps } from '@/hooks/query-keys'
import { useContainerManager } from './useContainerManager'
import { migrateWorkType } from './useContainerManager'
import type { DuplicateCheckCandidate } from '@/services/api/deliveredTrips.api'
import { checkBackendHealth } from '@/lib/backend-health'

/** One container the backend did NOT confirm during submit. */
export interface SubmitFailure {
  number: string | null
  reason: string
}

/** Honest submit-failure state. Shown instead of the green success overlay
 *  whenever ≥1 container was not confirmed by the backend. Form data is kept
 *  so the driver can retry in place. */
export interface SubmitError {
  failed: SubmitFailure[]
}

function submitFailureMessage(message?: string): string {
  if (message?.includes('DeliveredTrip photo already exists')) {
    return 'Ảnh này đã được dùng cho một chuyến khác – kiểm tra lại, không gửi trùng'
  }
  return message ?? 'Không gửi được – thử lại'
}

export function useCreateDeliveredTrip(existingDeliveredTrip?: DeliveredTrip | null) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuth()
  const isEdit = !!existingDeliveredTrip

  // ─── Container manager (OCR, validation, CRUD) ────────────────────────────
  const {
    containers,
    scannerOpen, setScannerOpen,
    forceManualEntry,
    handleScanComplete, scanNewContainer,
    containerErrors, containerSuggestions, containerIsoValidating,
    validateContainerOnBlur, applyContainerSuggestion,
    validateContainerFormat,
    updateContainer, removeContainer,
    addContainerWithNumber,
    updateAllContType, updateAllWorkType,
    hasAnyPhoto, containerCount,
    setContainerErrors,
  } = useContainerManager(existingDeliveredTrip)

  // ─── Reference data ───────────────────────────────────────────────────────
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

  // ─── Form state ───────────────────────────────────────────────────────────
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
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  // Honest submit failure — shown only when the backend did not confirm every
  // container. All form state (containers, photos, notes) is retained so the
  // driver can retry without re-entering data.
  const [submitError, setSubmitError] = useState<SubmitError | null>(null)
  // Container numbers the backend has confirmed this submit session. Retry
  // skips these so a non-idempotent POST /delivered-trips is never re-sent
  // (which would create a duplicate). Reset on each fresh submit.
  const succeededContNumbersRef = useRef<Set<string>>(new Set())

  // Duplicate-trip warning (driver submit-time check against own last 7 days)
  const [duplicateChecking, setDuplicateChecking] = useState(false)
  const [duplicateCandidates, setDuplicateCandidates] = useState<DuplicateCheckCandidate[]>([])
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false)

  // Suggestion loading
  const [suggestionLoading, setSuggestionLoading] = useState(true)

  // ─── Reference data loading ───────────────────────────────────────────────
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

  // ─── Suggestion selection ─────────────────────────────────────────────────
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

  // ─── Validation ───────────────────────────────────────────────────────────
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

  // ─── Submit flow ──────────────────────────────────────────────────────────
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

      // Pre-submit reachability gate: if the backend is unreachable, fail fast
      // with an honest error instead of letting each POST time out. Re-runs on
      // retry so a driver who regained signal can resend immediately.
      const healthy = await checkBackendHealth()
      if (!healthy) {
        setSubmitting(false)
        setSubmitError({
          failed: containers
            .filter(c => c.containerNumber.trim())
            .map(c => ({
              number: c.containerNumber.trim(),
              reason: 'Mất kết nối đến máy chủ – kiểm tra mạng rồi gửi lại',
            })),
        })
        return
      }

      // Edit mode: single container only. PUT is checked for success the same
      // way as create — no green overlay unless the backend confirmed the save.
      if (isEdit && existingDeliveredTrip) {
        const firstCont = containers[0]
        const contNumber = firstCont?.containerNumber.trim() || null
        try {
          const res = await apiClient.updateDeliveredTrip(existingDeliveredTrip.id, {
            contNumber,
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

          if (!res.success) {
            setSubmitting(false)
            setSubmitError({ failed: [{ number: contNumber, reason: res.message ?? 'Không lưu được – thử lại' }] })
            return
          }
        } catch {
          setSubmitting(false)
          setSubmitError({ failed: [{ number: contNumber, reason: 'Mất kết nối – kiểm tra mạng và gửi lại' }] })
          return
        }
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

      // Create mode: submit each container as a separate DeliveredTrip.
      // Success is truthful: the green overlay shows only when the backend
      // has confirmed EVERY container. POST /delivered-trips is not idempotent,
      // so retry skips containers already confirmed this session
      // (succeededContNumbersRef) to avoid creating duplicates.
      const activeContainers = containers.filter(c => c.containerNumber.trim())
      const failed: SubmitFailure[] = []

      for (const cont of activeContainers) {
        const contNumber = cont.containerNumber.trim()
        if (succeededContNumbersRef.current.has(contNumber)) continue

        try {
          const res = await apiClient.createDeliveredTrip({
            contNumber: contNumber || null,
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
            photoDataUrl: cont.photoTaken ? cont.photoDataUrl ?? null : null,
          })

          if (!res.success) {
            failed.push({ number: contNumber, reason: submitFailureMessage(res.message) })
            continue
          }

          succeededContNumbersRef.current.add(contNumber)

        } catch {
          failed.push({ number: contNumber, reason: 'Mất kết nối – kiểm tra mạng và gửi lại' })
        }
      }

      invalidateDeliveredTripDeps(qc)

      // Any container the backend did NOT confirm → NO success. Keep all form
      // data and surface the honest failures so the driver can retry in place.
      if (failed.length > 0) {
        setSubmitting(false)
        setSubmitError({ failed })
        return
      }

      setShowSuccess(true)
      if (vessel.trim()) addRecentVessel(vessel.trim())
      if (note.trim()) addRecentNote(note.trim())
      setTimeout(() => {
        setShowSuccess(false)
        navigate('/driver')
      }, 2000)
    } catch (err) {
      console.error('Submit failed:', err)
      setSubmitting(false)
      setSubmitError({ failed: [{ number: null, reason: 'Lỗi không xác định – thử lại' }] })
    }
  }, [containers, qc, clientId, vessel, note, pickupLocation, dropoffLocation, locations, user, navigate, isEdit, existingDeliveredTrip, addRecentVessel, addRecentNote, tripDate])

  // Driver tapped "Gửi lại" in the failure dialog → re-run the submit. The
  // succeededContNumbersRef is preserved so only unconfirmed containers re-send.
  const retrySubmit = useCallback(() => {
    setSubmitError(null)
    void confirmSubmit()
  }, [confirmSubmit])

  // Driver tapped "Đóng" in the failure dialog → keep the form data, stay on
  // the page, allow editing before the next attempt.
  const dismissSubmitError = useCallback(() => {
    setSubmitError(null)
    setSubmitting(false)
  }, [])

  const onRequestSubmit = useCallback(async (): Promise<'validation-error' | undefined> => {
    // Fresh submit: reset the confirmed-containers set so a previous (failed)
    // attempt's successes don't suppress a new submission. retrySubmit keeps
    // the set intact so it can skip already-confirmed containers.
    succeededContNumbersRef.current = new Set()
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
      return
    }

    // Create mode: warn if any container matches an existing trip of this
    // driver from the last 7 days (same photo, or same cont + route + type).
    const pickupId = locations.find(l => l.name === pickupLocation)?.id
    const dropoffId = locations.find(l => l.name === dropoffLocation)?.id
    if (!pickupId || !dropoffId) return

    setDuplicateChecking(true)
    try {
      const found: DuplicateCheckCandidate[] = []
      for (const c of containers.filter(x => x.containerNumber.trim())) {
        const res = await apiClient.checkDeliveredTripDuplicate({
          contNumber: c.containerNumber.trim() || null,
          contType: c.contType ?? null,
          pickupLocationId: pickupId,
          dropoffLocationId: dropoffId,
          tripDate,
          photoDataUrl: c.photoDataUrl ?? null,
        })
        if (res.success) found.push(...res.data.candidates)
      }
      if (found.length > 0) {
        setDuplicateCandidates(found)
        setDuplicateDialogOpen(true)
        return
      }
    } catch (err) {
      // Fail open: never block submission because the check itself errored.
      console.error('Duplicate check failed', err)
    } finally {
      setDuplicateChecking(false)
    }

    setSummaryOpen(true)
  }, [canSubmit, containers, isEdit, confirmSubmit, setContainerErrors, locations, pickupLocation, dropoffLocation, tripDate])

  // Driver acknowledged the duplicate warning → submit anyway.
  const onDuplicateOverride = useCallback(() => {
    setDuplicateDialogOpen(false)
    setDuplicateCandidates([])
    void confirmSubmit()
  }, [confirmSubmit])

  // Driver chose to cancel and revise the form.
  const onDuplicateCancel = useCallback(() => {
    setDuplicateDialogOpen(false)
    setDuplicateCandidates([])
  }, [])

  // ─── Summary data for dialog ──────────────────────────────────────────────
  const summaryContNumber = useMemo(() => {
    const numbers = containers
      .map(c => c.containerNumber.trim())
      .filter(Boolean)
    return numbers.length > 0 ? numbers.join(', ') : null
  }, [containers])

  const summaryContType = useMemo(() => containers[0]?.contType ?? null, [containers])
  const summaryWorkType = useMemo(() => containers[0]?.workType ?? null, [containers])

  const summaryClientName = useMemo(() => {
    const client = clients.find(c => String(c.id) === clientId)
    return client?.code || client?.name || ''
  }, [clients, clientId])

  // ─── Original values for edit-mode "Trước:" hints ────────────────────────
  const original = useMemo(() => {
    if (!existingDeliveredTrip) return null
    const [contType, workType] = migrateWorkType(existingDeliveredTrip.contType ?? null, existingDeliveredTrip.workType ?? null)
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
    submitError,
    duplicateChecking, duplicateCandidates, duplicateDialogOpen,
    forceManualEntry, missingFields, containerErrors, containerSuggestions, containerIsoValidating, suggestionLoading,

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
    handleScanComplete, setScannerOpen,
    updateContainer, removeContainer, validateContainerOnBlur,
    applyContainerSuggestion,
    updateAllContType, updateAllWorkType, scanNewContainer,
    addContainerWithNumber, validateContainerFormat,
    handleRecentTripSelect,
    onRequestSubmit, confirmSubmit,
    retrySubmit, dismissSubmitError,
    setSummaryOpen,
    onDuplicateOverride, onDuplicateCancel,
  }
}
