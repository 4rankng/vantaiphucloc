import { useState, useEffect, useCallback, useMemo } from 'react'
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
    lastScanPhotoRef,
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
  }, [canSubmit, containers, isEdit, confirmSubmit, setContainerErrors])

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
    setSummaryOpen,
  }
}
