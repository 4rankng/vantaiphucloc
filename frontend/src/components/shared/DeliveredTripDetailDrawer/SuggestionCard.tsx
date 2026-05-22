import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { InlineEditable } from '@/components/shared/InlineEditable/InlineEditable'
import { InlineSelect } from './InlineSelect'
import type { BookedTrip, ContType, OperationType } from '@/data/domain'
import { CONT_TYPES, OPERATION_TYPE_OPTIONS, OPERATION_TYPE_LABELS } from '@/data/domain'
import type { BookedTripUpdatePayload } from '@/services/api/bookedTrips.api'

export type UpdateBookedTripFn = {
  mutate: (args: { id: number; data: BookedTripUpdatePayload }) => void
  mutateAsync: (args: { id: number; data: BookedTripUpdatePayload }) => Promise<BookedTrip>
}

export function SuggestionCard({
  suggestion: s,
  isMatching,
  onMatch,
  updateBookedTrip: _update,
  clients,
  locations,
}: {
  suggestion: import('@/data/domain').MatchSuggestion
  isMatching: boolean
  onMatch: () => void
  updateBookedTrip: UpdateBookedTripFn
  clients: import('@/data/domain').Client[]
  locations: import('@/data/domain').Location[]
}) {
  const [bt, setBt] = useState(s.bookedTrip)
  useEffect(() => {
    setBt(s.bookedTrip)
  }, [s.bookedTrip.id, s.bookedTrip.updatedAt])
  const pct = s.maxScore > 0 ? Math.round((s.matchScore / s.maxScore) * 100) : 0

  const save = async (data: BookedTripUpdatePayload) => {
    const updated = await _update.mutateAsync({ id: bt.id, data })
    setBt(updated)
  }

  const localValue = (name: string): string | null | undefined => {
    switch (name) {
      case 'container_number': return bt.containers?.[0]?.containerNumber
      case 'pickup_location':  return bt.pickupLocation?.name
      case 'dropoff_location': return bt.dropoffLocation?.name
      case 'work_type':        return bt.containers?.[0]?.contType
      case 'vessel':           return bt.vessel
      case 'vehicle_plate':    return bt.vehiclePlate
      case 'operation_type':   return bt.operationType
        ? (OPERATION_TYPE_LABELS[bt.operationType as OperationType] ?? bt.operationType)
        : null
      case 'client':           return bt.client?.name
      default:                 return null
    }
  }

  return (
    <div
      className="flex flex-col gap-2 px-3.5 py-3"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-sm)',
      }}
    >
      <div className="min-w-0">
        <div className="grid" style={{ gridTemplateColumns: '1fr 1.4fr', gap: '6px 12px' }}>
          {s.criteria.map((c) => {
            const matchColor = c.match
              ? c.fuzzy ? 'var(--warning)' : 'var(--success)'
              : 'var(--ink-4)'
            const current = localValue(c.name)

            const editControl = () => {
              switch (c.name) {
                case 'vessel':
                  return (
                    <InlineEditable
                      display={<span style={{ color: current ? matchColor : 'var(--ink-4)' }}>{current ?? '—'}</span>}
                      value={bt.vessel ?? ''}
                      placeholder="Số tàu"
                      onSave={(v) => save({ vessel: v || null })}
                    />
                  )
                case 'pickup_location':
                  return (
                    <InlineSelect
                      value={bt.pickupLocation?.id ?? null}
                      displayValue={current}
                      options={locations.map((l) => ({ value: l.id, label: l.name }))}
                      onChange={(id) => save({ pickupLocationId: id as number })}
                    />
                  )
                case 'dropoff_location':
                  return (
                    <InlineSelect
                      value={bt.dropoffLocation?.id ?? null}
                      displayValue={current}
                      options={locations.map((l) => ({ value: l.id, label: l.name }))}
                      onChange={(id) => save({ dropoffLocationId: id as number })}
                    />
                  )
                case 'work_type':
                  return (
                    <InlineSelect
                      value={bt.containers?.[0]?.contType ?? null}
                      displayValue={current}
                      options={CONT_TYPES.map((t) => ({ value: t, label: t }))}
                      onChange={(v) => {
                        const containers = bt.containers?.map((c, i) =>
                          i === 0 ? { ...c, contType: v as ContType } : c,
                        )
                        if (containers) save({ containers })
                      }}
                    />
                  )
                case 'operation_type':
                  return (
                    <InlineSelect
                      value={bt.operationType ?? null}
                      displayValue={current}
                      options={OPERATION_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                      onChange={(v) => save({ operationType: v as OperationType })}
                    />
                  )
                case 'client':
                  return (
                    <InlineSelect
                      value={bt.client?.id ?? null}
                      displayValue={current}
                      options={clients.map((c) => ({ value: c.id, label: c.name }))}
                      onChange={(id) => save({ clientId: id as number })}
                    />
                  )
                case 'vehicle_plate':
                  return (
                    <InlineEditable
                      display={<span style={{ color: current ? matchColor : 'var(--ink-4)' }}>{current ?? '—'}</span>}
                      value={bt.vehiclePlate ?? ''}
                      placeholder="Biển số xe"
                      onSave={(v) => save({ vehiclePlate: v || null })}
                    />
                  )
                default:
                  return (
                    <span className="font-mono font-semibold" style={{ color: current ? matchColor : 'var(--ink-4)' }}>
                      {current ?? '—'}
                    </span>
                  )
              }
            }

            return (
              <div key={c.name} className="flex items-baseline gap-1 min-w-0 text-[12px]">
                <span className="shrink-0 text-[10px] font-semibold leading-none" style={{ color: matchColor }}>
                  {c.match ? '✓' : '✕'}
                </span>
                <span className="shrink-0 whitespace-nowrap" style={{ color: 'var(--ink-3)' }}>{c.label}:</span>
                <div className="min-w-0 flex-1 overflow-hidden">{editControl()}</div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          variant={pct >= 80 ? 'default' : 'outline'}
          size="sm"
          onClick={onMatch}
          disabled={isMatching}
        >
          {isMatching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Ghép
        </Button>
      </div>
    </div>
  )
}
