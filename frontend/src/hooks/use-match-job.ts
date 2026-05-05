import { useMemo, useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkOrders, useTripOrders, useClients, useRoutes, useUpdateWorkOrder, useUpdateTripOrder, useCreateTripOrder, useSuggestMatches } from '@/hooks/use-queries'
import { type WorkType } from '@/data/domain'

interface EditedJob {
  clientName: string
  route: string
  containers: { type: string; number: string }[]
}
interface EditedTrip {
  clientName: string
  route: string
  containers: { type: string; number: string }[]
}

export function useMatchJob(initialJobId: number) {
  const navigate = useNavigate()
  const { data: workOrders = [], isLoading: loadingWO } = useWorkOrders()
  const { data: trips = [], isLoading: loadingTrips } = useTripOrders()
  const { data: clients = [], isLoading: loadingClients } = useClients()
  const { data: routes = [], isLoading: loadingRoutes } = useRoutes()
  const { data: suggestionsData, isLoading: loadingSuggestions } = useSuggestMatches(initialJobId)
  const updateWorkOrder = useUpdateWorkOrder()
  const updateTripOrder = useUpdateTripOrder()
  const createTripOrder = useCreateTripOrder()

  const loading = loadingWO || loadingTrips || loadingClients || loadingRoutes
  const [submitting, setSubmitting] = useState(false)

  const [selectedJobId, setSelectedJobId] = useState(initialJobId)
  const [selectedTripId, setSelectedTripId] = useState(0)
  const [pickMode, setPickMode] = useState<'job' | 'trip' | null>(null)

  useEffect(() => {
    if (selectedTripId !== 0 || !suggestionsData?.suggestions?.length) return
    const best = suggestionsData.suggestions[0]
    if (best) setSelectedTripId(best.tripOrder.id)
  }, [suggestionsData, selectedTripId])

  const [jobOverride, setJobOverride] = useState<EditedJob | null>(null)
  const [tripOverride, setTripOverride] = useState<EditedTrip | null>(null)

  const matchedIds = useMemo(() => new Set(trips.flatMap(t => t.matchedWorkOrderIds)), [trips])
  const unmatchedJobs = useMemo(() => workOrders.filter(w => !matchedIds.has(w.id)), [workOrders, matchedIds])
  const draftTrips = useMemo(() => trips.filter(t => t.status === 'DRAFT' || t.status === 'PENDING'), [trips])

  const selectedJob = useMemo(() => workOrders.find(w => w.id === selectedJobId), [workOrders, selectedJobId])
  const selectedTrip = useMemo(() => trips.find(t => t.id === selectedTripId), [trips, selectedTripId])

  const suggestions = suggestionsData?.suggestions ?? []

  const baseJob = useMemo(() => selectedJob ? {
    clientName: selectedJob.client.name,
    route: selectedJob.route,
    containers: selectedJob.containers.map(c => ({ type: c.workType, number: c.containerNumber })),
  } : null, [selectedJob])

  const baseTrip = useMemo(() => selectedTrip ? {
    clientName: selectedTrip.client.name,
    route: selectedTrip.route,
    containers: (selectedTrip.containers ?? []).map(c => ({ type: c.workType, number: c.containerNumber })),
  } : null, [selectedTrip])

  const editedJob = jobOverride ?? baseJob
  const editedTrip = tripOverride ?? baseTrip

  const handleSelectJob = useCallback((id: number) => {
    setSelectedJobId(id)
    setJobOverride(null)
  }, [])

  const handleSelectTrip = useCallback((id: number) => {
    setSelectedTripId(id)
    setTripOverride(null)
  }, [])

  const clientOptions = useMemo(() => clients.map(c => ({ value: c.name, label: c.name })), [clients])
  const routeOptions = useMemo(() => routes.map(r => ({ value: r.route, label: r.route })), [routes])

  // Direct setter helpers — initialize override from base when needed
  const setJobClient = useCallback((v: string) => {
    setJobOverride(prev => ({ ...(prev ?? baseJob ?? { clientName: '', route: '', containers: [] }), clientName: v }))
  }, [baseJob])

  const setJobRoute = useCallback((v: string) => {
    setJobOverride(prev => ({ ...(prev ?? baseJob ?? { clientName: '', route: '', containers: [] }), route: v }))
  }, [baseJob])

  const setJobContainers = useCallback((containers: { type: string; number: string }[]) => {
    setJobOverride(prev => ({ ...(prev ?? baseJob ?? { clientName: '', route: '', containers: [] }), containers }))
  }, [baseJob])

  const setTripClient = useCallback((v: string) => {
    setTripOverride(prev => ({ ...(prev ?? baseTrip ?? { clientName: '', route: '', containers: [] }), clientName: v }))
  }, [baseTrip])

  const setTripRoute = useCallback((v: string) => {
    setTripOverride(prev => ({ ...(prev ?? baseTrip ?? { clientName: '', route: '', containers: [] }), route: v }))
  }, [baseTrip])

  const setTripContainers = useCallback((containers: { type: string; number: string }[]) => {
    setTripOverride(prev => ({ ...(prev ?? baseTrip ?? { clientName: '', route: '', containers: [] }), containers }))
  }, [baseTrip])

  const jobClient = editedJob?.clientName ?? ''
  const tripClient = editedTrip?.clientName ?? ''
  const jobRoute = editedJob?.route ?? ''
  const tripRoute = editedTrip?.route ?? ''
  const jobConts = editedJob?.containers ?? []
  const tripConts = editedTrip?.containers ?? []

  const contMatched = tripConts.length > 0 && tripConts.every(tc =>
    jobConts.some(jc => jc.type === tc.type && jc.number === tc.number)
  )
  const clientMatched = jobClient === tripClient && jobClient !== ''
  const routeMatched = jobRoute === tripRoute && jobRoute !== ''

  const handleMatch = async () => {
    if (!selectedJob || !selectedTrip || !editedJob || !editedTrip || submitting) return
    setSubmitting(true)
    try {
      await updateWorkOrder.mutateAsync({ id: selectedJobId, data: {
        route: editedJob.route,
        containers: editedJob.containers.map(c => ({ containerNumber: c.number, workType: c.type as WorkType, photoUrl: '' })),
      }})
      await updateTripOrder.mutateAsync({ id: selectedTripId, data: {
        route: editedTrip.route,
        containers: editedTrip.containers.map(c => ({ containerNumber: c.number, workType: c.type as WorkType })),
      }})
      await createTripOrder.mutateAsync({
        tripDate: selectedTrip.tripDate,
        clientId: selectedTrip.client.id,
        route: editedTrip.route,
        pickupLocationId: selectedTrip.pickupLocation.id,
        dropoffLocationId: selectedTrip.dropoffLocation.id,
        containers: editedTrip.containers.map(c => ({ containerNumber: c.number, workType: c.type as WorkType })),
        pricingId: selectedTrip.pricingId,
        unitPrice: selectedTrip.unitPrice,
        driverSalary: selectedTrip.driverSalary,
        allowance: selectedTrip.allowance,
        revenue: selectedTrip.unitPrice,
        matchedWorkOrderIds: [selectedJobId],
      })
      navigate(-1)
    } catch { setSubmitting(false) }
  }

  return {
    loading, loadingSuggestions, submitting, pickMode, setPickMode,
    clientOptions, routeOptions,
    unmatchedJobs, draftTrips,
    selectedJob, selectedTrip,
    selectedJobId, setSelectedJobId: handleSelectJob,
    selectedTripId, setSelectedTripId: handleSelectTrip,
    suggestions,
    jobClient, tripClient, jobRoute, tripRoute, jobConts, tripConts,
    contMatched, clientMatched, routeMatched,
    setJobClient, setJobRoute, setJobContainers,
    setTripClient, setTripRoute, setTripContainers,
    handleMatch,
  }
}
