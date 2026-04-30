import { useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkOrders, useTripOrders, useClients, useRoutes, useUpdateWorkOrder, useUpdateTripOrder, useCreateTripOrder, useSuggestMatches } from '@/hooks/use-queries'
import { type WorkType } from '@/data/domain'

type EditDialogMode = 'cont-left' | 'cont-right' | 'client-left' | 'client-right' | 'route-left' | 'route-right' | null

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

  // Edit dialog
  const [editDialog, setEditDialog] = useState<EditDialogMode>(null)

  // Local editable overrides (null = use derived, non-null = user edited)
  const [jobOverride, setJobOverride] = useState<EditedJob | null>(null)
  const [tripOverride, setTripOverride] = useState<EditedTrip | null>(null)

  // Dialog-local state for container editing
  const [dialogContainers, setDialogContainers] = useState<{ type: string; number: string }[]>([])
  const [dialogContRight, setDialogContRight] = useState<{ type: string; number: string }[]>([])

  const matchedIds = useMemo(() => new Set(trips.flatMap(t => t.matchedWorkOrderIds)), [trips])
  const unmatchedJobs = useMemo(() => workOrders.filter(w => !matchedIds.has(w.id)), [workOrders, matchedIds])
  const draftTrips = useMemo(() => trips.filter(t => t.status === 'DRAFT'), [trips])

  const selectedJob = useMemo(() => workOrders.find(w => w.id === selectedJobId), [workOrders, selectedJobId])
  const selectedTrip = useMemo(() => trips.find(t => t.id === selectedTripId), [trips, selectedTripId])

  // Suggestions from backend
  const suggestions = suggestionsData?.suggestions ?? []

  // Derived base values
  const baseJob = useMemo(() => selectedJob ? {
    clientName: selectedJob.clientName,
    route: selectedJob.route,
    containers: selectedJob.containers.map(c => ({ type: c.workType, number: c.containerNumber })),
  } : null, [selectedJob])

  const baseTrip = useMemo(() => selectedTrip ? {
    clientName: selectedTrip.clientName,
    route: selectedTrip.route,
    containers: (selectedTrip.containers?.length ? selectedTrip.containers : (
      selectedTrip.containerNumber ? [{ type: selectedTrip.workType ?? 'E20', number: selectedTrip.containerNumber }] : []
    )).map(c => ({ type: c.workType, number: c.containerNumber })),
  } : null, [selectedTrip])

  // Final edited values: override takes precedence
  const editedJob = jobOverride ?? baseJob
  const editedTrip = tripOverride ?? baseTrip

  // When selection changes, clear overrides
  const handleSelectJob = useCallback((id: number) => {
    setSelectedJobId(id)
    setJobOverride(null)
  }, [])

  const handleSelectTrip = useCallback((id: number) => {
    setSelectedTripId(id)
    setTripOverride(null)
  }, [])

  // Client/route options
  const clientOptions = useMemo(() => clients.map(c => ({ value: c.name, label: c.name })), [clients])
  const routeOptions = useMemo(() => routes.map(r => ({ value: r.route, label: r.route })), [routes])

  // Open edit dialog with current values
  const openEdit = (mode: EditDialogMode) => {
    if (!mode) return
    if (mode === 'cont-left' && editedJob) setDialogContainers([...editedJob.containers])
    if (mode === 'cont-right' && editedTrip) setDialogContRight([...editedTrip.containers])
    setEditDialog(mode)
  }

  const saveDialog = () => {
    if (!editDialog) return
    if (editDialog === 'cont-left' && editedJob) setJobOverride({ ...editedJob, containers: [...dialogContainers] })
    if (editDialog === 'cont-right' && editedTrip) setTripOverride({ ...editedTrip, containers: [...dialogContRight] })
    setEditDialog(null)
  }

  // Validation
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
        clientName: editedJob.clientName,
        route: editedJob.route,
        containers: editedJob.containers.map(c => ({ containerNumber: c.number, workType: c.type as WorkType, photoUrl: '' })),
      }})
      await updateTripOrder.mutateAsync({ id: selectedTripId, data: {
        clientName: editedTrip.clientName,
        route: editedTrip.route,
        containers: editedTrip.containers.map(c => ({ containerNumber: c.number, workType: c.type as WorkType })),
      }})
      await createTripOrder.mutateAsync({
        tripDate: selectedTrip.tripDate,
        clientId: selectedTrip.clientId,
        clientName: editedTrip.clientName,
        route: editedTrip.route,
        tractorPlate: selectedJob.tractorPlate,
        driverId: selectedJob.driverId,
        driverName: selectedJob.driverName,
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
    // State
    loading, loadingSuggestions, submitting, pickMode, setPickMode,
    editDialog, setEditDialog,
    editedJob, setEditedJob: setJobOverride,
    editedTrip, setEditedTrip: setTripOverride,
    dialogContainers, setDialogContainers,
    dialogContRight, setDialogContRight,
    // Data
    clientOptions, routeOptions,
    unmatchedJobs, draftTrips,
    selectedJob, selectedTrip,
    selectedJobId, setSelectedJobId: handleSelectJob,
    selectedTripId, setSelectedTripId: handleSelectTrip,
    // Suggestions
    suggestions,
    // Validation
    jobClient, tripClient, jobRoute, tripRoute, jobConts, tripConts,
    contMatched, clientMatched, routeMatched,
    // Handlers
    openEdit, saveDialog, handleMatch,
  }
}
