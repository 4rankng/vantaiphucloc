import { useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkOrders, useTripOrders, useClients, useRoutes, useUpdateWorkOrder, useUpdateTripOrder, useCreateTripOrder, useSuggestWosForTrip } from '@/hooks/use-queries'
import { type WorkType } from '@/data/domain'

type EditDialogMode = 'cont-left' | 'cont-right' | 'client-left' | 'client-right' | 'route-left' | 'route-right' | null

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
  const createTripOrder = useCreateTripOrder()

  const loading = loadingWO || loadingTrips || loadingClients || loadingRoutes
  const [submitting, setSubmitting] = useState(false)

  const [selectedTripId, setSelectedTripId] = useState(initialTripId)
  const [selectedJobId, setSelectedJobId] = useState(0)
  const [pickMode, setPickMode] = useState<'trip' | 'job' | null>(null)

  // Edit dialog
  const [editDialog, setEditDialog] = useState<EditDialogMode>(null)

  // Local editable overrides
  const [tripOverride, setTripOverride] = useState<EditedTrip | null>(null)
  const [jobOverride, setJobOverride] = useState<EditedJob | null>(null)

  // Dialog-local state for container editing
  const [dialogContLeft, setDialogContLeft] = useState<{ type: string; number: string }[]>([])
  const [dialogContainers, setDialogContainers] = useState<{ type: string; number: string }[]>([])

  const matchedIds = useMemo(() => new Set(trips.flatMap(t => t.matchedWorkOrderIds)), [trips])
  const unmatchedJobs = useMemo(() => workOrders.filter(w => !matchedIds.has(w.id)), [workOrders, matchedIds])
  const draftTrips = useMemo(() => trips.filter(t => t.status === 'DRAFT'), [trips])

  const selectedTrip = useMemo(() => trips.find(t => t.id === selectedTripId), [trips, selectedTripId])
  const selectedJob = useMemo(() => workOrders.find(w => w.id === selectedJobId), [workOrders, selectedJobId])

  // Suggestions from backend
  const suggestions = suggestionsData?.suggestions ?? []

  // Derived base values
  const baseTrip = useMemo(() => selectedTrip ? {
    clientName: selectedTrip.clientName,
    route: selectedTrip.route,
    containers: (selectedTrip.containers?.length ? selectedTrip.containers : (
      selectedTrip.containerNumber ? [{ workType: selectedTrip.workType ?? 'E20', containerNumber: selectedTrip.containerNumber }] : []
    )).map(c => ({ type: c.workType, number: c.containerNumber })),
  } : null, [selectedTrip])

  const baseJob = useMemo(() => selectedJob ? {
    clientName: selectedJob.clientName,
    route: selectedJob.route,
    containers: selectedJob.containers.map(c => ({ type: c.workType, number: c.containerNumber })),
  } : null, [selectedJob])

  // Final edited values: override takes precedence
  const editedTrip = tripOverride ?? baseTrip
  const editedJob = jobOverride ?? baseJob

  // When selection changes, clear overrides
  const handleSelectTrip = useCallback((id: number) => {
    setSelectedTripId(id)
    setTripOverride(null)
  }, [])

  const handleSelectJob = useCallback((id: number) => {
    setSelectedJobId(id)
    setJobOverride(null)
  }, [])

  // Client/route options
  const clientOptions = useMemo(() => clients.map(c => ({ value: c.name, label: c.name })), [clients])
  const routeOptions = useMemo(() => routes.map(r => ({ value: r.route, label: r.route })), [routes])

  // Open edit dialog with current values
  const openEdit = (mode: EditDialogMode) => {
    if (!mode) return
    if (mode === 'cont-left' && editedTrip) setDialogContLeft([...editedTrip.containers])
    if (mode === 'cont-right' && editedJob) setDialogContainers([...editedJob.containers])
    setEditDialog(mode)
  }

  const saveDialog = () => {
    if (!editDialog) return
    if (editDialog === 'cont-left' && editedTrip) setTripOverride({ ...editedTrip, containers: [...dialogContLeft] })
    if (editDialog === 'cont-right' && editedJob) setJobOverride({ ...editedJob, containers: [...dialogContainers] })
    setEditDialog(null)
  }

  // Validation
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
      await updateTripOrder.mutateAsync({ id: selectedTripId, data: {
        clientName: editedTrip.clientName,
        route: editedTrip.route,
        containers: editedTrip.containers.map(c => ({ containerNumber: c.number, workType: c.type as WorkType })),
      }})
      await updateWorkOrder.mutateAsync({ id: selectedJobId, data: {
        clientName: editedJob.clientName,
        route: editedJob.route,
        containers: editedJob.containers.map(c => ({ containerNumber: c.number, workType: c.type as WorkType, photoUrl: '' })),
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
    dialogContLeft, setDialogContLeft,
    dialogContainers, setDialogContainers,
    // Data
    clientOptions, routeOptions,
    unmatchedJobs, draftTrips,
    selectedJob, selectedTrip,
    selectedTripId, setSelectedTripId: handleSelectTrip,
    selectedJobId, setSelectedJobId: handleSelectJob,
    // Suggestions
    suggestions,
    // Validation
    tripClient, jobClient, tripRoute, jobRoute, tripConts, jobConts,
    contMatched, clientMatched, routeMatched,
    // Handlers
    openEdit, saveDialog, handleMatch,
  }
}
