import { useState, useMemo, useCallback } from 'react'
import { fmtDate } from '@/lib/date-utils'
import {
  Check, CheckCircle2, Pencil, X, Plus, Truck, FileText,
  Sparkles, ChevronRight, ChevronDown, XCircle,
} from 'lucide-react'
import {
  useDeliveredTrips, useBookedTrips, useSuggestMatches, useRoutes,
  useUpdateDeliveredTrip, useUpdateBookedTrip, useReconcile,
} from '@/hooks/use-queries'
import { ContBadge } from '@/components/shared/ContBadge'
import { useToast } from '@/components/atoms/Toast'
import type { BookedTrip, DeliveredTrip, ContType } from '@/data/domain'
import { InlineField } from './InlineField'
import { ContainerRow } from './ContainerRow'
import { DeliveredTripCard } from './DeliveredTripCard'
import { SuggestionCard } from './SuggestionCard'


// ─── Helpers ─────────────────────────────────────────────────────────────────


// ─── Main panel ────────────────────────────────────────────────────────────────

interface MatchPanelProps {
  deliveredTrip: DeliveredTrip
  onClose: () => void
  onMatchSuccess: () => void
}

export function MatchPanel({ deliveredTrip, onClose, onMatchSuccess }: MatchPanelProps) {
  const toast = useToast()

  // ── Data ──────────────────────────────────────────────────────────────────
  const { isLoading: loadingWO } = useDeliveredTrips()
  const { data: _allTrips, isLoading: loadingTrips } = useBookedTrips()
  const allTrips = _allTrips?.items ?? []
  const { data: suggestionsData, isLoading: loadingSuggestions } = useSuggestMatches(deliveredTrip.id)
  const { data: routes = [] } = useRoutes()

  const routeMap = useMemo(() =>
    new Map(routes.map(r => [r.route, { pickup: r.pickupLocation.name, dropoff: r.dropoffLocation.name }])),
    [routes]
  )

  const updateDeliveredTrip = useUpdateDeliveredTrip()
  const updateBookedTrip = useUpdateBookedTrip()
  const reconcile = useReconcile()

  const loading = loadingWO || loadingTrips

  // ── Work order ────────────────────────────────────────────────────────────
  const [woClient, setWoClient] = useState('')
  const [woRoute, setWoRoute] = useState('')
  const [woPickup, setWoPickup] = useState('')
  const [woDropoff, setWoDropoff] = useState('')
  const [woContainers, setWoContainers] = useState<{ workType: string; containerNumber: string }[]>([])
  const [woInitialized, setWoInitialized] = useState(false)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (deliveredTrip && !woInitialized) {
      setWoClient(deliveredTrip.client.name)
      setWoRoute(deliveredTrip.route)
      const resolved = routeMap.get(deliveredTrip.route)
      setWoPickup(deliveredTrip.pickupLocation.name || resolved?.pickup || '')
      setWoDropoff(deliveredTrip.dropoffLocation.name || resolved?.dropoff || '')
      setWoContainers(deliveredTrip.containers.map(c => ({ workType: c.workType, containerNumber: c.containerNumber })))
      setWoInitialized(true)
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [deliveredTrip, woInitialized, routeMap])

  const updateWoContainer = useCallback((idx: number, field: 'workType' | 'containerNumber', value: string) => {
    setWoContainers(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c))
  }, [])

  // ── Suggestions ───────────────────────────────────────────────────────────
  const suggestions = useMemo(() => suggestionsData?.suggestions ?? [], [suggestionsData])

  // ── Selected trip ─────────────────────────────────────────────────────────
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (selectedTripId === null && suggestions.length > 0) {
      setSelectedTripId(suggestions[0].bookedTrip.id)
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [suggestions, selectedTripId])

  const selectedTrip = useMemo(
    () => allTrips.find(t => t.id === selectedTripId) ?? null,
    [allTrips, selectedTripId],
  )

  // Local editable state for selected trip
  const [tripClient, setTripClient] = useState('')
  const [tripRoute, setTripRoute] = useState('')
  const [tripPickup, setTripPickup] = useState('')
  const [tripDropoff, setTripDropoff] = useState('')
  const [tripContainers, setTripContainers] = useState<{ workType: string; containerNumber: string }[]>([])
  const [tripInitKey, setTripInitKey] = useState<number | null>(null)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (selectedTrip && selectedTrip.id !== tripInitKey) {
      setTripClient(selectedTrip.client.name)
      setTripRoute(selectedTrip.route)
      const resolved = routeMap.get(selectedTrip.route)
      setTripPickup(selectedTrip.pickupLocation.name || resolved?.pickup || '')
      setTripDropoff(selectedTrip.dropoffLocation.name || resolved?.dropoff || '')
      setTripContainers(
        (selectedTrip.containers ?? []).map(c => ({ workType: c.workType, containerNumber: c.containerNumber }))
      )
      setTripInitKey(selectedTrip.id)
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [selectedTrip, tripInitKey, routeMap])

  const updateTripContainer = useCallback((idx: number, field: 'workType' | 'containerNumber', value: string) => {
    setTripContainers(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c))
  }, [])

  // ── Match computation ─────────────────────────────────────────────────────
  const selectedSuggestion = useMemo(
    () => suggestions.find(s => s.bookedTrip.id === selectedTripId) ?? null,
    [suggestions, selectedTripId]
  )
  const backendMatchedFields = useMemo(
    () => new Set(selectedSuggestion?.matchedFields ?? []),
    [selectedSuggestion]
  )

  const matchedWoIndices = useMemo(() => {
    if (!selectedTrip) return new Set<number>()
    const tripSet = new Set(tripContainers.map(c => `${c.workType}|${c.containerNumber}`))
    return new Set(
      woContainers
        .map((c, i) => tripSet.has(`${c.workType}|${c.containerNumber}`) ? i : -1)
        .filter(i => i >= 0)
    )
  }, [woContainers, tripContainers, selectedTrip])

  const matchedTripContainerIndices = useMemo(() => {
    const woSet = new Set(woContainers.map(c => `${c.workType}|${c.containerNumber}`))
    return new Set(
      tripContainers
        .map((c, i) => (c.containerNumber && woSet.has(`${c.workType}|${c.containerNumber}`)) ? i : -1)
        .filter(i => i >= 0)
    )
  }, [woContainers, tripContainers])

  const clientMatch = backendMatchedFields.has('client') || (woClient !== '' && woClient === tripClient)
  const pickupMatch = backendMatchedFields.has('pickup_location') || (woPickup !== '' && woPickup === tripPickup)
  const dropoffMatch = backendMatchedFields.has('dropoff_location') || (woDropoff !== '' && woDropoff === tripDropoff)

  const totalCriteria = useMemo(() =>
    woContainers.length
    + (woClient !== '' ? 1 : 0)
    + (woPickup !== '' ? 1 : 0)
    + (woDropoff !== '' ? 1 : 0),
    [woContainers, woClient, woPickup, woDropoff]
  )

  // ── Submit ────────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false)

  const handleMatch = async () => {
    if (!deliveredTrip || !selectedTrip || submitting) return
    setSubmitting(true)

    const woResult = await updateDeliveredTrip.mutateAsync({
      id: deliveredTrip.id,
      data: {
        route: woRoute,
        containers: woContainers.map(c => ({ containerNumber: c.containerNumber, contType: c.contType as ContType, photoUrl: '' })),
      },
    })
    if (!woResult.success) {
      toast.error('Lỗi', 'Không thể cập nhật phiếu chuyến')
      setSubmitting(false)
      return
    }

    const toResult = await updateBookedTrip.mutateAsync({
      id: selectedTrip.id,
      data: {
        route: tripRoute,
        containers: tripContainers.map(c => ({ containerNumber: c.containerNumber, contType: c.contType as ContType })),
      },
    })
    if (!toResult.success) {
      toast.error('Lỗi', 'Không thể cập nhật đơn hàng')
      setSubmitting(false)
      return
    }

    await reconcile.mutateAsync({ deliveredTripId: deliveredTrip.id, bookedTripId: selectedTrip.id })

    toast.success('Thành công', 'Đã ghép chuyến thành công')
    onMatchSuccess()
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-40 rounded-xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
          ))}
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-5">

      {/* Close button */}
      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}
        >
          <XCircle className="w-3.5 h-3.5" />
          Thu gọn
        </button>
      </div>

      {/* Work order card */}
      <DeliveredTripCard
        driverName={deliveredTrip.driver?.name ?? (deliveredTrip.vehicleExternalPlate ? `Xe ngoài · ${deliveredTrip.vehicleExternalPlate}` : 'Xe ngoài')}
        driverPlate={deliveredTrip.driver?.vehicle?.plate ?? deliveredTrip.vehicleExternalPlate}
        woContainers={woContainers}
        woClient={woClient}
        woPickup={woPickup}
        woDropoff={woDropoff}
        setWoClient={setWoClient}
        setWoPickup={setWoPickup}
        setWoDropoff={setWoDropoff}
        setWoContainers={setWoContainers}
        updateWoContainer={updateWoContainer}
        clientMatch={clientMatch}
        pickupMatch={pickupMatch}
        dropoffMatch={dropoffMatch}
        matchedWoIndices={matchedWoIndices}
      />

      {/* Suggestions section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
            Đơn hàng có thể ghép
          </h2>
          {loadingSuggestions ? (
            <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>
              <Sparkles className="w-3 h-3 animate-pulse" /> Đang tìm...
            </span>
          ) : (
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}
            >
              {suggestions.length}
            </span>
          )}
        </div>

        {suggestions.length === 0 && !loadingSuggestions ? (
          <div
            className="rounded-xl p-10 text-center flex flex-col items-center gap-3"
            style={{ background: 'var(--theme-bg-secondary)', border: '1px dashed var(--theme-border-default)' }}
          >
            <FileText className="w-10 h-10" style={{ color: 'var(--theme-text-muted)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              Không tìm thấy đơn hàng phù hợp
            </p>
            <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
              Tạo đơn hàng mới để bắt đầu ghép chuyến
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map(s => {
              const sTripContainers = s.bookedTrip.containers ?? []
              const sTripContainerSet = new Set(sTripContainers.map(c => `${c.workType}|${c.containerNumber}`))
              const matchedContainersCount = woContainers.filter(
                c => c.containerNumber && sTripContainerSet.has(`${c.workType}|${c.containerNumber}`)
              ).length
              const matchedCount = matchedContainersCount
                + (s.matchedFields.includes('client') ? 1 : 0)
                + (s.matchedFields.includes('pickup_location') ? 1 : 0)
                + (s.matchedFields.includes('dropoff_location') ? 1 : 0)

              const isSelected = selectedTripId === s.bookedTrip.id

              return (
                <SuggestionCard
                  key={s.bookedTrip.id}
                  trip={s.bookedTrip}
                  isSelected={isSelected}
                  matchedCount={matchedCount}
                  totalCriteria={totalCriteria}
                  tripContainers={isSelected ? tripContainers : (s.bookedTrip.containers ?? []).map(c => ({ workType: c.workType, containerNumber: c.containerNumber }))}
                  tripClient={isSelected ? tripClient : s.bookedTrip.client.name}
                  tripPickup={isSelected ? tripPickup : ''}
                  tripDropoff={isSelected ? tripDropoff : ''}
                  matchedTripContainerIndices={isSelected ? matchedTripContainerIndices : new Set()}
                  clientMatch={isSelected ? clientMatch : false}
                  pickupMatch={isSelected ? pickupMatch : false}
                  dropoffMatch={isSelected ? dropoffMatch : false}
                  updateTripContainer={updateTripContainer}
                  setTripContainers={setTripContainers}
                  onChangeTripClient={setTripClient}
                  onChangeTripPickup={setTripPickup}
                  onChangeTripDropoff={setTripDropoff}
                  onSelect={() => setSelectedTripId(isSelected ? null : s.bookedTrip.id)}
                  onConfirm={handleMatch}
                  submitting={submitting}
                />
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
