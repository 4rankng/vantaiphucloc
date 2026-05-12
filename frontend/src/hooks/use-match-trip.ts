import { useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkOrders, useTripOrders, useClients, useRoutes, useUpdateWorkOrder, useUpdateTripOrder, useBatchReconcileForWO } from '@/hooks/use-queries'
import { type WorkType } from '@/data/domain'

interface EditedTrip {
  clientName: string
  route: string
  containers: { type: string; number: string }[]
}
interface EditedJob {
  clientName: string
  route: string
  containers: { type: string; number: string }[]
}

export function useMatchTrip(initialTripId: number) {
  const navigate = useNavigate()
  const { data: workOrders = [], isLoading: loadingWO } = useWorkOrders()
  const { data: trips = [], isLoading: loadingTrips } = useTripOrders()
  const { data: clients = [], isLoading: loadingClients } = useClients()
  const { data: routes = [], isLoading: loadingRoutes } = useRoutes()
  const updateWorkOrder = useUpdateWorkOrder()
  const updateTripOrder = useUpdateTripOrder()
  const batchReconcile = useBatchReconcileForWO()

  const loading = loadingWO || loadingTrips || loadingClients || loadingRoutes
  const [submitting, setSubmitting] = useState(false)

  const [selectedTripIds, setSelectedTripIds] = useState<number[]>(
    initialTripId ? [initialTripId] : []
  )
  const [selectedJobId, setSelectedJobId] = useState(0)
  const [pickMode, setPickMode] = useState<'trip' | 'job' | null>(null)

  const [tripOverride, setTripOverride] = useState<EditedTrip | null>(null)
  const [jobOverride, setJobOverride] = useState<EditedJob | null>(null)

  const matchedIds = useMemo(() => new Set(trips.flatMap(t => t.matchedWorkOrderIds)), [trips])
  const unmatchedJobs = useMemo(() => workOrders.filter(w => !matchedIds.has(w.id)), [workOrders, matchedIds])
  const draftTrips = useMemo(() => trips.filter(t => t.status === 'DRAFT' || t.status === 'PENDING'), [trips])

  const selectedJob = useMemo(() => workOrders.find(w => w.id === selectedJobId), [workOrders, selectedJobId])
  const selectedTrips = useMemo(() => trips.filter(t => selectedTripIds.includes(t.id)), [trips, selectedTripIds])
  // First selected trip for the edit panel (backward compat)
  const selectedTrip = selectedTrips[0] ?? null

  const toggleTripSelection = useCallback((id: number) => {
    setSelectedTripIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
    setTripOverride(null)
  }, [])

  const handleSelectJob = useCallback((id: number) => {
    setSelectedJobId(id)
    setJobOverride(null)
  }, [])

  const clientOptions = useMemo(() => clients.map(c => ({ value: c.name, label: c.name })), [clients])
  const routeOptions = useMemo(() => routes.map(r => ({ value: r.route, label: r.route })), [routes])

  const baseTrip = useMemo(() => selectedTrip ? {
    clientName: selectedTrip.partner.name,
    route: `${selectedTrip.pickupLocation?.name ?? ''} → ${selectedTrip.dropoffLocation?.name ?? ''}`,
    containers: (selectedTrip.containers ?? []).map(c => ({ type: c.workType, number: c.containerNumber })),
  } : null, [selectedTrip])

  const baseJob = useMemo(() => selectedJob ? {
    clientName: selectedJob.partner.name,
    route: `${selectedJob.pickupLocation?.name ?? ''} → ${selectedJob.dropoffLocation?.name ?? ''}`,
    containers: selectedJob.containers.map(c => ({ type: c.workType, number: c.containerNumber })),
  } : null, [selectedJob])

  const editedTrip = tripOverride ?? baseTrip
  const editedJob = jobOverride ?? baseJob

  const setTripClient = useCallback((v: string) => {
    setTripOverride(prev => ({ ...(prev ?? baseTrip ?? { clientName: '', route: '', containers: [] }), clientName: v }))
  }, [baseTrip])

  const setTripRoute = useCallback((v: string) => {
    setTripOverride(prev => ({ ...(prev ?? baseTrip ?? { clientName: '', route: '', containers: [] }), route: v }))
  }, [baseTrip])

  const setTripContainers = useCallback((containers: { type: string; number: string }[]) => {
    setTripOverride(prev => ({ ...(prev ?? baseTrip ?? { clientName: '', route: '', containers: [] }), containers }))
  }, [baseTrip])

  const setJobClient = useCallback((v: string) => {
    setJobOverride(prev => ({ ...(prev ?? baseJob ?? { clientName: '', route: '', containers: [] }), clientName: v }))
  }, [baseJob])

  const setJobRoute = useCallback((v: string) => {
    setJobOverride(prev => ({ ...(prev ?? baseJob ?? { clientName: '', route: '', containers: [] }), route: v }))
  }, [baseJob])

  const setJobContainers = useCallback((containers: { type: string; number: string }[]) => {
    setJobOverride(prev => ({ ...(prev ?? baseJob ?? { clientName: '', route: '', containers: [] }), containers }))
  }, [baseJob])

  const tripClient = editedTrip?.clientName ?? ''
  const jobClient = editedJob?.clientName ?? ''
  const tripRoute = editedTrip?.route ?? ''
  const jobRoute = editedJob?.route ?? ''
  const tripConts = editedTrip?.containers ?? []
  const jobConts = editedJob?.containers ?? []

  const contMatched = tripConts.length > 0 && tripConts.every(tc =>
    jobConts.some(jc => jc.type === tc.type && jc.number === tc.number)
  )
  const clientMatched = jobClient === tripClient && jobClient !== ''
  const routeMatched = jobRoute === tripRoute && jobRoute !== ''

  const getTripMatchStatus = useCallback((tripId: number) => {
    const trip = trips.find(t => t.id === tripId)
    if (!trip || !selectedJob) return 'none' as const
    const tripContainers = trip.containers ?? []
    const woContainers = selectedJob.containers
    const allMatch = tripContainers.every(tc =>
      woContainers.some(jc => jc.workType === tc.workType && jc.containerNumber === tc.containerNumber)
    )
    if (allMatch) return 'full' as const
    const someMatch = tripContainers.some(tc =>
      woContainers.some(jc => jc.workType === tc.workType && jc.containerNumber === tc.containerNumber)
    )
    if (someMatch) return 'partial' as const
    return 'none' as const
  }, [trips, selectedJob])

  const handleMatch = async () => {
    if (!selectedTrips.length || !selectedJob || !editedJob || submitting) return
    setSubmitting(true)
    try {
      // Apply edits to work order if changed
      if (jobOverride) {
        await updateWorkOrder.mutateAsync({ id: selectedJobId, data: {
          route: editedJob.route,
          containers: editedJob.containers.map(c => ({ containerNumber: c.number, workType: c.type as WorkType, photoUrl: '' })),
        }})
      }
      // Batch match: 1 WO → N TOs
      await batchReconcile.mutateAsync({
        workOrderId: selectedJobId,
        tripOrderIds: selectedTripIds,
      })
      navigate(-1)
    } catch (err) { setSubmitting(false); throw err }
  }

  return {
    loading, submitting, pickMode, setPickMode,
    clientOptions, routeOptions,
    unmatchedJobs, draftTrips,
    selectedJob,
    selectedTrips,
    selectedTripIds,
    toggleTripSelection,
    getTripMatchStatus,
    selectedTripId: selectedTripIds[0] ?? 0,
    selectedJobId, setSelectedJobId: handleSelectJob,
    // suggestions removed — not used in batch flow
    tripClient, jobClient, tripRoute, jobRoute, tripConts, jobConts,
    contMatched, clientMatched, routeMatched,
    setTripClient, setTripRoute, setTripContainers,
    setJobClient, setJobRoute, setJobContainers,
    handleMatch,
  }
}
