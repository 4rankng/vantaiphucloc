import { useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkOrders, useTripOrders, useClients, useRoutes, useUpdateWorkOrder, useUpdateTripOrder, useCreateTripOrder } from '@/hooks/use-queries'
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
  contType: string
  contNumber: string
}

export function useMatchJob(initialJobId: number) {
  const navigate = useNavigate()
  const { data: workOrders = [], isLoading: loadingWO } = useWorkOrders()
  const { data: trips = [], isLoading: loadingTrips } = useTripOrders()
  const { data: clients = [], isLoading: loadingClients } = useClients()
  const { data: routes = [], isLoading: loadingRoutes } = useRoutes()
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
  const [dialogContRight, setDialogContRight] = useState<{ type: string; number: string }>({ type: 'E20', number: '' })

  const matchedIds = useMemo(() => new Set(trips.flatMap(t => t.matchedWorkOrderIds)), [trips])
  const unmatchedJobs = useMemo(() => workOrders.filter(w => !matchedIds.has(w.id)), [workOrders, matchedIds])
  const draftTrips = useMemo(() => trips.filter(t => t.status === 'DRAFT'), [trips])

  const selectedJob = useMemo(() => workOrders.find(w => w.id === selectedJobId), [workOrders, selectedJobId])
  const selectedTrip = useMemo(() => trips.find(t => t.id === selectedTripId), [trips, selectedTripId])

  // Derived base values (reset overrides when selection changes)
  const baseJob = useMemo(() => selectedJob ? {
    clientName: selectedJob.clientName,
    route: selectedJob.route,
    containers: selectedJob.containers.map(c => ({ type: c.workType, number: c.containerNumber })),
  } : null, [selectedJob])

  const baseTrip = useMemo(() => selectedTrip ? {
    clientName: selectedTrip.clientName,
    route: selectedTrip.route,
    contType: selectedTrip.workType,
    contNumber: selectedTrip.containerNumber,
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

  // Open edit dialog with current values
  const openEdit = (mode: EditDialogMode) => {
    if (!mode) return
    if (mode === 'cont-left' && editedJob) setDialogContainers([...editedJob.containers])
    if (mode === 'cont-right' && editedTrip) setDialogContRight({ type: editedTrip.contType, number: editedTrip.contNumber })
    setEditDialog(mode)
  }

  const saveDialog = () => {
    if (!editDialog) return
    if (editDialog === 'cont-left' && editedJob) setJobOverride({ ...editedJob, containers: [...dialogContainers] })
    if (editDialog === 'cont-right' && editedTrip) setTripOverride({ ...editedTrip, contType: dialogContRight.type, contNumber: dialogContRight.number })
    setEditDialog(null)
  }

  // Validation
  const jobClient = editedJob?.clientName ?? ''
  const tripClient = editedTrip?.clientName ?? ''
  const jobRoute = editedJob?.route ?? ''
  const tripRoute = editedTrip?.route ?? ''
  const jobConts = editedJob?.containers ?? []
  const tripCont = editedTrip ? { type: editedTrip.contType, number: editedTrip.contNumber } : null

  const contMatched = tripCont ? jobConts.some(c => c.type === tripCont.type && c.number === tripCont.number) : false
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
        workType: editedTrip.contType as WorkType,
        containerNumber: editedTrip.contNumber,
      }})
      await createTripOrder.mutateAsync({
        tripDate: selectedTrip.tripDate,
        clientId: selectedTrip.clientId,
        clientName: editedTrip.clientName,
        workType: editedTrip.contType as WorkType,
        route: editedTrip.route,
        tractorPlate: selectedJob.tractorPlate,
        driverId: selectedJob.driverId,
        driverName: selectedJob.driverName,
        containerNumber: editedTrip.contNumber,
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
    loading, submitting, pickMode, setPickMode,
    editDialog, setEditDialog,
    editedJob, setEditedJob: setJobOverride,
    editedTrip, setEditedTrip: setTripOverride,
    dialogContainers, setDialogContainers,
    dialogContRight, setDialogContRight,
    // Data
    clients, routes,
    unmatchedJobs, draftTrips,
    selectedJob, selectedTrip,
    selectedJobId, setSelectedJobId: handleSelectJob,
    selectedTripId, setSelectedTripId: handleSelectTrip,
    // Validation
    jobClient, tripClient, jobRoute, tripRoute, jobConts, tripCont,
    contMatched, clientMatched, routeMatched,
    // Handlers
    openEdit, saveDialog, handleMatch,
  }
}
