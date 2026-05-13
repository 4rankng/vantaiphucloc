/**
 * Đối soát chuyến với khách hàng — import the customer's reply file.
 *
 * Phase 1 scaffolding: accountant pastes parsed rows in a simple format.
 * Future work: replace the textarea with an Excel parser that emits the
 * same `ParsedRowInput[]` shape (the API is already stable).
 */

import { CheckCircle2, FileSpreadsheet, Search, XCircle } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useCustomerReconciliation } from './useCustomerReconciliation'
import { formatDateRange } from '@/lib/format'

export function CustomerReconciliation() {
  const r = useCustomerReconciliation()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="typo-display">Đối soát với khách hàng</h1>
        <p className="typo-body-sm mt-1">
          Nhập kết quả đối soát do khách hàng gửi lại (chuyến nào khớp / không
          khớp). Hệ thống sẽ tham chiếu lại đơn hàng theo số container + ngày.
        </p>
      </div>

      {/* Upload form */}
      <section className="card p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="typo-form-label" htmlFor="recon-partner">
              Khách hàng
            </label>
            <select
              id="recon-partner"
              value={r.fields.partnerId ?? ''}
              onChange={(e) =>
                r.setPartnerId(e.target.value ? Number(e.target.value) : null)
              }
              className="h-10 w-full rounded-md px-3 text-sm"
              style={{
                border: '1px solid var(--theme-border-default)',
                background: 'var(--theme-bg-primary)',
                color: 'var(--theme-text-primary)',
              }}
              disabled={r.loadingPartners}
            >
              <option value="">— Chọn khách hàng —</option>
              {r.partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="typo-form-label" htmlFor="recon-period-start">
              Từ ngày
            </label>
            <Input
              id="recon-period-start"
              type="date"
              value={r.fields.periodStart}
              onChange={(e) => r.setPeriodStart(e.target.value)}
              className="h-10 text-sm font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="typo-form-label" htmlFor="recon-period-end">
              Đến ngày
            </label>
            <Input
              id="recon-period-end"
              type="date"
              value={r.fields.periodEnd}
              onChange={(e) => r.setPeriodEnd(e.target.value)}
              className="h-10 text-sm font-mono"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="typo-form-label" htmlFor="recon-filename">
            Tên file gốc (tùy chọn)
          </label>
          <Input
            id="recon-filename"
            value={r.fields.filename}
            onChange={(e) => r.setFilename(e.target.value)}
            placeholder="VD: doisoat-thang5.xlsx"
            className="h-10 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label className="typo-form-label" htmlFor="recon-rows">
            Dữ liệu đối soát
          </label>
          <p
            className="text-xs"
            style={{ color: 'var(--theme-text-muted)' }}
          >
            Dán mỗi dòng theo format:{' '}
            <code className="text-[11px] px-1 py-0.5 rounded bg-[var(--theme-bg-tertiary)]">
              container, YYYY-MM-DD, MATCHED|REJECTED|UNKNOWN, ghi chú
            </code>
          </p>
          <textarea
            id="recon-rows"
            value={r.fields.rawRows}
            onChange={(e) => r.setRawRows(e.target.value)}
            placeholder={
              'HLBU1234567, 2026-05-10, MATCHED\nABCU0000123, 2026-05-12, REJECTED, Không nhận chuyến'
            }
            rows={6}
            className="w-full rounded-md px-3 py-2 text-sm font-mono"
            style={{
              border: '1px solid var(--theme-border-default)',
              background: 'var(--theme-bg-primary)',
              color: 'var(--theme-text-primary)',
            }}
          />
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            onClick={r.reset}
            className="btn-secondary h-9 px-4 text-sm"
          >
            Xóa
          </Button>
          <Button
            type="button"
            onClick={r.handlePreview}
            disabled={r.isPreviewing}
            className="btn-primary h-9 px-4 text-sm"
          >
            <Search className="w-3.5 h-3.5 mr-1.5" />
            {r.isPreviewing ? 'Đang phân tích…' : 'Phân tích & lưu'}
          </Button>
        </div>
      </section>

      {/* Preview result */}
      {r.preview && (
        <section className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="typo-h3">Kết quả phân tích</p>
              <p
                className="typo-caption mt-0.5"
                style={{ color: 'var(--theme-text-muted)' }}
              >
                {r.preview.partnerName} · Kỳ{' '}
                {formatDateRange(
                  r.preview.periodStart,
                  r.preview.periodEnd,
                  'short',
                )}{' '}
                · Trạng thái: <strong>{r.preview.status}</strong>
              </p>
            </div>
            {r.preview.status === 'PARSED' && (
              <Button
                type="button"
                onClick={r.handleCommit}
                disabled={r.isCommitting}
                className="btn-primary h-9 px-4 text-sm"
              >
                {r.isCommitting ? 'Đang ghi nhận…' : 'Xác nhận đối soát'}
              </Button>
            )}
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-4">
            <SummaryStat label="Tổng dòng" value={r.preview.summary?.total ?? 0} />
            <SummaryStat
              label="Khách OK"
              value={r.preview.summary?.matched ?? 0}
              tone="success"
            />
            <SummaryStat
              label="Khách từ chối"
              value={r.preview.summary?.rejected ?? 0}
              tone="error"
            />
            <SummaryStat
              label="Tìm thấy chuyến"
              value={r.preview.summary?.resolved ?? 0}
            />
            <SummaryStat
              label="Chưa khớp được"
              value={r.preview.summary?.unresolved ?? 0}
              tone="error"
            />
          </div>

          {/* Rows table */}
          <div
            className="rounded-lg overflow-hidden"
            style={{ border: '1px solid var(--theme-border-default)' }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--theme-bg-tertiary)' }}>
                  <th
                    className="text-left px-4 py-2.5 text-xs font-semibold"
                    style={{ color: 'var(--theme-text-muted)' }}
                  >
                    Container
                  </th>
                  <th
                    className="text-left px-4 py-2.5 text-xs font-semibold"
                    style={{ color: 'var(--theme-text-muted)' }}
                  >
                    Ngày
                  </th>
                  <th
                    className="text-left px-4 py-2.5 text-xs font-semibold"
                    style={{ color: 'var(--theme-text-muted)' }}
                  >
                    Khách phản hồi
                  </th>
                  <th
                    className="text-left px-4 py-2.5 text-xs font-semibold"
                    style={{ color: 'var(--theme-text-muted)' }}
                  >
                    Khớp chuyến
                  </th>
                  <th
                    className="text-left px-4 py-2.5 text-xs font-semibold"
                    style={{ color: 'var(--theme-text-muted)' }}
                  >
                    Ghi chú
                  </th>
                </tr>
              </thead>
              <tbody>
                {r.preview.rows.map((row, i) => (
                  <tr
                    key={row.id}
                    style={{
                      background:
                        i % 2 === 0
                          ? 'var(--theme-bg-primary)'
                          : 'var(--theme-bg-secondary)',
                      borderTop: '1px solid var(--theme-border-light)',
                    }}
                  >
                    <td
                      className="px-4 py-2 font-mono tabular-nums"
                      style={{ color: 'var(--theme-text-primary)' }}
                    >
                      {row.containerNumber ?? '—'}
                    </td>
                    <td
                      className="px-4 py-2 tabular-nums"
                      style={{ color: 'var(--theme-text-primary)' }}
                    >
                      {row.tripDate ?? '—'}
                    </td>
                    <td className="px-4 py-2">
                      <VerdictBadge status={row.customerStatus} />
                    </td>
                    <td className="px-4 py-2">
                      {row.resolvedTripOrderId ? (
                        <span
                          className="inline-flex items-center gap-1 text-xs"
                          style={{ color: 'var(--theme-status-success)' }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> #
                          {row.resolvedTripOrderId}
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-xs"
                          style={{ color: 'var(--theme-status-error)' }}
                        >
                          <XCircle className="w-3.5 h-3.5" /> Không tìm thấy
                        </span>
                      )}
                    </td>
                    <td
                      className="px-4 py-2 text-xs"
                      style={{ color: 'var(--theme-text-muted)' }}
                    >
                      {row.customerNote ?? row.applyMessage ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Recent history */}
      <section className="space-y-2">
        <h2 className="typo-h2">Lần đối soát gần đây</h2>
        {r.loadingHistory ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-10 rounded-lg animate-pulse"
                style={{ background: 'var(--theme-bg-tertiary)' }}
              />
            ))}
          </div>
        ) : r.history.length === 0 ? (
          <div className="card p-6 text-center">
            <FileSpreadsheet
              className="w-7 h-7 mx-auto mb-2"
              style={{ color: 'var(--theme-text-muted)', opacity: 0.5 }}
            />
            <p
              className="text-sm"
              style={{ color: 'var(--theme-text-muted)' }}
            >
              Chưa có lần đối soát nào
            </p>
          </div>
        ) : (
          <div
            className="rounded-lg overflow-hidden"
            style={{ border: '1px solid var(--theme-border-default)' }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--theme-bg-tertiary)' }}>
                  <th
                    className="text-left px-4 py-2.5 text-xs font-semibold"
                    style={{ color: 'var(--theme-text-muted)' }}
                  >
                    Khách hàng
                  </th>
                  <th
                    className="text-left px-4 py-2.5 text-xs font-semibold"
                    style={{ color: 'var(--theme-text-muted)' }}
                  >
                    Kỳ
                  </th>
                  <th
                    className="text-left px-4 py-2.5 text-xs font-semibold"
                    style={{ color: 'var(--theme-text-muted)' }}
                  >
                    File
                  </th>
                  <th
                    className="text-left px-4 py-2.5 text-xs font-semibold"
                    style={{ color: 'var(--theme-text-muted)' }}
                  >
                    Trạng thái
                  </th>
                  <th
                    className="text-right px-4 py-2.5 text-xs font-semibold"
                    style={{ color: 'var(--theme-text-muted)' }}
                  >
                    Tổng / Khớp
                  </th>
                </tr>
              </thead>
              <tbody>
                {r.history.map((imp, i) => (
                  <tr
                    key={imp.id}
                    style={{
                      background:
                        i % 2 === 0
                          ? 'var(--theme-bg-primary)'
                          : 'var(--theme-bg-secondary)',
                      borderTop: '1px solid var(--theme-border-light)',
                    }}
                  >
                    <td
                      className="px-4 py-2"
                      style={{ color: 'var(--theme-text-primary)' }}
                    >
                      {imp.partnerName ?? '—'}
                    </td>
                    <td
                      className="px-4 py-2 tabular-nums"
                      style={{ color: 'var(--theme-text-primary)' }}
                    >
                      {formatDateRange(imp.periodStart, imp.periodEnd, 'short')}
                    </td>
                    <td
                      className="px-4 py-2 text-xs truncate max-w-[240px]"
                      style={{ color: 'var(--theme-text-muted)' }}
                    >
                      {imp.sourceFilename ?? '—'}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className="inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold"
                        style={{
                          background:
                            imp.status === 'APPLIED'
                              ? 'color-mix(in srgb, var(--theme-status-success) 18%, transparent)'
                              : 'color-mix(in srgb, var(--theme-text-muted) 18%, transparent)',
                          color:
                            imp.status === 'APPLIED'
                              ? 'var(--theme-status-success)'
                              : 'var(--theme-text-muted)',
                        }}
                      >
                        {imp.status}
                      </span>
                    </td>
                    <td
                      className="px-4 py-2 text-right tabular-nums text-xs"
                      style={{ color: 'var(--theme-text-primary)' }}
                    >
                      {imp.summary?.resolved ?? 0} / {imp.summary?.total ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: 'success' | 'error'
}) {
  const color =
    tone === 'success'
      ? 'var(--theme-status-success)'
      : tone === 'error'
        ? 'var(--theme-status-error)'
        : 'var(--theme-text-primary)'
  return (
    <div
      className="rounded-md px-3 py-2"
      style={{ background: 'var(--theme-bg-tertiary)' }}
    >
      <p className="typo-caption">{label}</p>
      <p
        className="text-base font-semibold tabular-nums"
        style={{ color }}
      >
        {value}
      </p>
    </div>
  )
}

function VerdictBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    MATCHED: {
      label: 'Khớp',
      color: 'var(--theme-status-success)',
    },
    REJECTED: {
      label: 'Từ chối',
      color: 'var(--theme-status-error)',
    },
    UNKNOWN: {
      label: 'Chưa rõ',
      color: 'var(--theme-text-muted)',
    },
  }
  const v = map[status] ?? map.UNKNOWN
  return (
    <span
      className="inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold"
      style={{
        background: `color-mix(in srgb, ${v.color} 18%, transparent)`,
        color: v.color,
      }}
    >
      {v.label}
    </span>
  )
}
