import { useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkOrders, useTripOrders, useClients, useRoutes, useUpdateWorkOrder, useUpdateTripOrder, useReconcile, useSuggestWosForTrip } from '@/hooks/use-queries'
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
  const { data: suggestionsData, isLoading: loadingSuggestions } = useSuggestWosForTrip(initialTripId)
  const updateWorkOrder = useUpdateWorkOrder()
  const updateTripOrder = useUpdateTripOrder()
  const reconcile = useReconcile()

  const loading = loadingWO || loadingTrips || loadingClients || loadingRoutes
  const [submitting, setSubmitting] = useState(false)

  const [selectedTripId, setSelectedTripId] = useState(initialTripId)
  const [selectedJobId, setSelectedJobId] = useState(0)
  const [pickMode, setPickMode] = useState<'trip' | 'job' | null>(null)

  const [tripOverride, setTripOverride] = useState<EditedTrip | null>(null)
  const [jobOverride, setJobOverride] = useState<EditedJob | null>(null)

  const matchedIds = useMemo(() => new Set(trips.flatMap(t => t.matchedWorkOrderIds)), [trips])
  const unmatchedJobs = useMemo(() => workOrders.filter(w => !matchedIds.has(w.id)), [workOrders, matchedIds])
  const draftTrips = useMemo(() => trips.filter(t => t.status === 'DRAFT' || t.status === 'PENDING'), [trips])

  const selectedTrip = useMemo(() => trips.find(t => t.id === selectedTripId), [trips, selectedTripId])
  const selectedJob = useMemo(() => workOrders.find(w => w.id === selectedJobId), [workOrders, selectedJobId])

  const suggestions = suggestionsData?.suggestions ?? []

  const baseTrip = useMemo(() => selectedTrip ? {
    clientName: selectedTrip.partner.name,
    route: selectedTrip.route,
    containers: (selectedTrip.containers ?? []).map(c => ({ type: c.workType, number: c.containerNumber })),
  } : null, [selectedTrip])

  const baseJob = useMemo(() => selectedJob ? {
    clientName: selectedJob.partner.name,
    route: selectedJob.route,
    containers: selectedJob.containers.map(c => ({ type: c.workType, number: c.containerNumber })),
  } : null, [selectedJob])

  const editedTrip = tripOverride ?? baseTrip
  const editedJob = jobOverride ?? baseJob

  const handleSelectTrip = useCallback((id: number) => {
    setSelectedTripId(id)
    setTripOverride(null)
  }, [])

  const handleSelectJob = useCallback((id: number) => {
    setSelectedJobId(id)
    setJobOverride(null)
  }, [])

  const clientOptions = useMemo(() => clients.map(c => ({ value: c.name, label: c.name })), [clients])
  const routeOptions = useMemo(() => routes.map(r => ({ value: r.route, label: r.route })), [routes])

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

  const handleMatch = async () => {
    if (!selectedTrip || !selectedJob || !editedTrip || !editedJob || submitting) return
    setSubmitting(true)
    try {
      // Apply edits to trip order if changed
      if (tripOverride) {
        await updateTripOrder.mutateAsync({ id: selectedTripId, data: {
          route: editedTrip.route,
          containers: editedTrip.containers.map(c => ({ containerNumber: c.number, workType: c.type as WorkType })),
        }})
      }
      // Apply edits to work order if changed
      if (jobOverride) {
        await updateWorkOrder.mutateAsync({ id: selectedJobId, data: {
          route: editedJob.route,
          containers: editedJob.containers.map(c => ({ containerNumber: c.number, workType: c.type as WorkType, photoUrl: '' })),
        }})
      }
      // Link them via the proper reconcile endpoint
      await reconcile.mutateAsync({ workOrderId: selectedJobId, tripOrderId: selectedTripId })
      navigate(-1)
    } catch (err) { setSubmitting(false); throw err }
  }

  return {
    loading, loadingSuggestions, submitting, pickMode, setPickMode,
    clientOptions, routeOptions,
    unmatchedJobs, draftTrips,
    selectedJob, selectedTrip,
    selectedTripId, setSelectedTripId: handleSelectTrip,
    selectedJobId, setSelectedJobId: handleSelectJob,
    suggestions,
    tripClient, jobClient, tripRoute, jobRoute, tripConts, jobConts,
    contMatched, clientMatched, routeMatched,
    setTripClient, setTripRoute, setTripContainers,
    setJobClient, setJobRoute, setJobContainers,
    handleMatch,
  }
}
