import { X } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/Sheet'
import type { DirectorDashboardDrilldown, DirectorDashboardDrilldownClient } from '@/services/api/pnl.api'

export type KpiMetric = 'trips' | 'revenue' | 'cost' | 'profit'

const METRIC_LABELS: Record<KpiMetric, string> = {
  trips: 'Tổng chuyến',
  revenue: 'Doanh thu',
  cost: 'Chi phí',
  profit: 'Lợi nhuận',
}

function metricValue(client: DirectorDashboardDrilldownClient, metric: KpiMetric) {
  if (metric === 'trips') return client.tripCount
  if (metric === 'revenue') return client.revenue
  if (metric === 'cost') return client.cost
  return client.profit
}

function metricVehicleValue(vehicle: DirectorDashboardDrilldownClient['vehicles'][number], metric: KpiMetric) {
  if (metric === 'trips') return vehicle.tripCount
  if (metric === 'revenue') return vehicle.revenue
  if (metric === 'cost') return vehicle.cost
  return vehicle.profit
}

function metricTotalValue(totals: DirectorDashboardDrilldown['totals'], metric: KpiMetric) {
  if (metric === 'trips') return totals.total
  if (metric === 'revenue') return totals.revenue
  if (metric === 'cost') return totals.cost
  return totals.profit
}

function formatMetricValue(value: number, metric: KpiMetric) {
  return metric === 'trips' ? `${value.toLocaleString('vi-VN')} chuyến` : value.toLocaleString('vi-VN')
}

export function DirectorKpiDrilldownSheet({
  open,
  metric,
  data,
  loading,
  onClose,
}: {
  open: boolean
  metric: KpiMetric
  data: DirectorDashboardDrilldown | null | undefined
  loading: boolean
  onClose: () => void
}) {
  const clients = data?.clients ?? []
  const totals = data?.totals
  const metricLabel = METRIC_LABELS[metric]
  const overviewClients = [...clients].sort((a, b) => metricValue(b, metric) - metricValue(a, metric))

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent
        side="bottom"
        className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden rounded-none px-4 pb-4 pt-3 sm:mx-auto sm:h-[90dvh] sm:max-w-3xl sm:rounded-t-2xl text-left"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full" style={{ background: 'var(--theme-border-default)' }} />
        <SheetHeader className="space-y-1 text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="text-lg leading-tight">{metricLabel} theo chủ hàng</SheetTitle>
              <p className="text-xs leading-snug" style={{ color: 'var(--theme-text-muted)' }}>
                Bao gồm tuyến đã ghép và chưa ghép
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-secondary)' }}
              aria-label="Đóng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </SheetHeader>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1 custom-scrollbar">
          {loading && (
            <p className="py-8 text-center text-sm" style={{ color: 'var(--theme-text-muted)' }}>Đang tải…</p>
          )}
          {!loading && clients.length === 0 && (
            <p className="py-8 text-center text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chưa có dữ liệu</p>
          )}
          <div className="space-y-4">
            {totals && clients.length > 0 && (
              <section
                className="rounded-xl border p-3"
                style={{ borderColor: 'var(--theme-border-default)', background: 'var(--theme-bg-primary)' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold leading-snug" style={{ color: 'var(--theme-text-primary)' }}>
                      Tổng quan {metricLabel.toLowerCase()}
                    </h3>
                    <p className="mt-0.5 text-[11px] leading-tight" style={{ color: 'var(--theme-text-muted)' }}>
                      {totals.total.toLocaleString('vi-VN')} chuyến · {totals.matched.toLocaleString('vi-VN')} đã ghép · {totals.pending.toLocaleString('vi-VN')} chưa ghép
                    </p>
                  </div>
                  <p
                    className="shrink-0 text-right font-mono text-sm font-bold tabular-nums"
                    style={{ color: metric === 'profit' && metricTotalValue(totals, metric) < 0 ? 'var(--theme-status-error)' : 'var(--theme-text-primary)' }}
                  >
                    {formatMetricValue(metricTotalValue(totals, metric), metric)}
                  </p>
                </div>

                <div className="mt-3 space-y-2">
                  {overviewClients.map(client => (
                    <div
                      key={`overview-${client.clientId}`}
                      className="grid items-center gap-3 rounded-lg px-2.5 py-2.5"
                      style={{ gridTemplateColumns: 'minmax(0, 1fr) auto', background: 'var(--theme-bg-secondary)' }}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold leading-snug break-words" style={{ color: 'var(--theme-text-primary)' }}>
                          {client.clientName}
                        </p>
                        <p className="mt-0.5 text-[10px] leading-tight" style={{ color: 'var(--theme-text-muted)' }}>
                          {client.tripCount.toLocaleString('vi-VN')} chuyến · {client.matched.toLocaleString('vi-VN')} ghép · {client.pending.toLocaleString('vi-VN')} chưa ghép
                        </p>
                      </div>
                      <p
                        className="font-mono text-xs font-bold tabular-nums text-right"
                        style={{ color: metric === 'profit' && metricValue(client, metric) < 0 ? 'var(--theme-status-error)' : 'var(--theme-text-primary)' }}
                      >
                        {formatMetricValue(metricValue(client, metric), metric)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {clients.length > 0 && (
              <div>
                <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
                  Chi tiết theo xe
                </h3>
                <div className="space-y-3">
                  {overviewClients.map(client => (
                    <section
                      key={client.clientId}
                      className="rounded-xl border p-3"
                      style={{ borderColor: 'var(--theme-border-default)', background: 'var(--theme-bg-primary)' }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold leading-snug" style={{ color: 'var(--theme-text-primary)' }}>{client.clientName}</h3>
                          <p className="mt-0.5 text-[11px] leading-tight" style={{ color: 'var(--theme-text-muted)' }}>
                            {client.matched} đã ghép · {client.pending} chưa ghép
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-mono text-sm font-bold tabular-nums" style={{ color: metric === 'profit' && metricValue(client, metric) < 0 ? 'var(--theme-status-error)' : 'var(--theme-text-primary)' }}>
                            {formatMetricValue(metricValue(client, metric), metric)}
                          </p>
                          <p className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>{metricLabel}</p>
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        {client.vehicles.map(vehicle => (
                          <div
                            key={`${client.clientId}-${vehicle.vehiclePlate}`}
                            className="grid items-center gap-2 rounded-lg px-2 py-2"
                            style={{ gridTemplateColumns: 'minmax(0, 1fr) auto', background: 'var(--theme-bg-secondary)' }}
                          >
                            <div className="min-w-0">
                              <p className="font-mono text-xs font-semibold leading-tight break-words" style={{ color: 'var(--theme-text-primary)' }}>
                                {vehicle.vehiclePlate}
                              </p>
                              <p className="mt-0.5 text-[10px] leading-tight" style={{ color: 'var(--theme-text-muted)' }}>
                                {vehicle.tripCount} chuyến · {vehicle.matched} ghép · {vehicle.pending} chưa ghép
                              </p>
                            </div>
                            <p className="font-mono text-xs font-bold tabular-nums text-right" style={{ color: metric === 'profit' && metricVehicleValue(vehicle, metric) < 0 ? 'var(--theme-status-error)' : 'var(--theme-text-primary)' }}>
                              {formatMetricValue(metricVehicleValue(vehicle, metric), metric)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
