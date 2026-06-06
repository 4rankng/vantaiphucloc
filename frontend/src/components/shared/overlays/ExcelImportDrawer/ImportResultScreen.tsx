import { CheckCircle } from 'lucide-react'
import type { VendorImportResponse, DriverCommitResponse } from '@/services/api/imports.api'

interface ImportResultScreenProps {
  importType: 'client' | 'vendor' | 'driver'
  fileName?: string
  clientCreated?: number
  clientLocationsCreated?: number
  clientErrors?: string[]
  vendorResult: VendorImportResponse | null
  driverResult: DriverCommitResponse | null
  totalRows: number
}

export function ImportResultScreen({
  importType,
  fileName,
  clientCreated = 0,
  clientLocationsCreated = 0,
  clientErrors,
  vendorResult,
  driverResult,
  totalRows,
}: ImportResultScreenProps) {
  const errors = importType === 'client'
    ? clientErrors ?? []
    : importType === 'driver'
      ? driverResult?.errors ?? []
      : vendorResult?.errors ?? []

  return (
    <div className="flex flex-col items-center text-center py-6 max-w-xl mx-auto">
      {/* Success icon */}
      <div
        className="grid place-items-center mb-4"
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'var(--success-soft)',
          color: 'var(--success)',
          boxShadow: '0 0 0 6px color-mix(in srgb, var(--success-soft) 50%, transparent)',
        }}
      >
        <CheckCircle className="h-8 w-8" strokeWidth={1.75} />
      </div>
      <h3
        className="m-0 text-[18px] font-bold"
        style={{ letterSpacing: '-0.02em', color: 'var(--ink)' }}
      >
        Nhập dữ liệu thành công
      </h3>
      <p
        className="m-0 mt-2 text-[13px] leading-relaxed"
        style={{ color: 'var(--ink-2)' }}
      >
        Dữ liệu từ tệp{' '}
        <span className="font-semibold font-mono" style={{ color: 'var(--ink)' }}>
          {fileName}
        </span>{' '}
        đã được xử lý hoàn tất.
      </p>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 w-full mt-6">
        {importType === 'client' ? (
          <>
            <StatCard value={clientCreated} label="Chuyến đã tạo" color="var(--success)" />
            <StatCard value={clientLocationsCreated} label="Địa điểm mới" />
          </>
        ) : importType === 'driver' ? (
          <>
            <StatCard value={driverResult?.created ?? 0} label="Chuyến nội bộ tạo mới" color="var(--success)" />
            <StatCard value={driverResult?.matched ?? 0} label="Chuyến tự động so khớp" color="var(--accent)" />
          </>
        ) : (
          <>
            <StatCard value={vendorResult?.created ?? 0} label="Chuyến thầu tạo mới" color="var(--success)" />
            <StatCard value={vendorResult?.matched ?? 0} label="Chuyến tự động so khớp" color="var(--accent)" />
            <div className="col-span-2 p-2.5 rounded-lg border border-solid" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}>
              <p className="text-[14px] font-semibold m-0" style={{ color: 'var(--ink)' }}>
                Tổng số dòng xử lý: {totalRows}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Errors list */}
      {errors.length > 0 && (
        <div className="w-full text-left mt-5 space-y-1.5">
          <h4 className="text-[12.5px] font-bold m-0 text-red-600" style={{ color: 'var(--danger)' }}>
            Một số dòng gặp lỗi khi xử lý ({errors.length}):
          </h4>
          <div
            className="p-3 rounded border border-solid max-h-40 overflow-y-auto"
            style={{ borderColor: 'var(--line)', background: 'var(--surface-2)', fontSize: 11.5 }}
          >
            {errors.map((err, idx) => (
              <p key={idx} className="m-0 mt-1 font-mono text-red-500" style={{ color: 'var(--danger)' }}>
                {err}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ value, label, color = 'var(--ink)' }: { value: number; label: string; color?: string }) {
  return (
    <div className="p-3 rounded-lg border border-solid" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}>
      <p className="text-[20px] font-bold m-0 tabular-nums" style={{ color }}>
        {value}
      </p>
      <p className="text-[11px] m-0 mt-0.5" style={{ color: 'var(--ink-3)' }}>{label}</p>
    </div>
  )
}
