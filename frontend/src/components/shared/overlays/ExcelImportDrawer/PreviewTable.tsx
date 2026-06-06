import { InlineSelect } from '@/components/shared/forms/InlineSelect'
import { NUMERIC_COLS, type PreviewRow } from '../importTypes'
import type { PreviewResultDto } from '@/services/api/imports.api'

interface PreviewTableProps {
  columns: string[]
  data: PreviewRow[]
  previewResult: PreviewResultDto | null
  resolvedFreightKinds: Record<number, 'E' | 'F'>
  onResolveFreightKind: (rowIndex: number, kind: 'E' | 'F') => void
}

export function PreviewTable({
  columns,
  data,
  previewResult,
  resolvedFreightKinds,
  onResolveFreightKind,
}: PreviewTableProps) {
  if (data.length === 0) {
    return (
      <p className="text-[13px] text-center py-8" style={{ color: 'var(--ink-3)' }}>
        Không có dữ liệu
      </p>
    )
  }

  return (
    <div
      className="preview-table-wrap"
      style={{ maxHeight: 'calc(100vh - 280px)' }}
    >
      <table className="nepo-table w-full" style={{ minWidth: 600 }}>
        <thead>
          <tr>
            <th style={{ width: 40 }}>#</th>
            {columns.map((key) => (
              <th
                key={key}
                className={`text-left ${NUMERIC_COLS.has(key) ? 'text-right' : ''}`}
                style={
                  key === 'Loại Cont'
                    ? { width: 60 }
                    : key === 'Số Cont'
                    ? { width: 100 }
                    : key === 'Chủ hàng'
                    ? { width: 160, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }
                    : undefined
                }
              >
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td>
                <span className="tabular-nums text-[12px]" style={{ color: 'var(--ink-3)' }}>
                  {i + 1}
                </span>
              </td>
              {columns.map((key) => {
                const val = row[key]
                const isNumeric = NUMERIC_COLS.has(key)
                const isFreightKindUnknown = previewResult?.accepted?.[i]?.values?.freight_kind_unknown ?? false
                const isFreightKindCol = key === 'Loại Cont'
                const showFreightPicker = isFreightKindCol && isFreightKindUnknown
                const resolved = resolvedFreightKinds[i]

                return (
                  <td
                    key={key}
                    className={isNumeric ? 'text-right' : ''}
                    style={
                      key === 'Chủ hàng'
                        ? { maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
                        : undefined
                    }
                  >
                    {showFreightPicker ? (
                      <InlineSelect
                        placeholder="Chọn E/F"
                        value={resolved ?? ''}
                        options={[
                          { value: 'E', label: `E${previewResult?.accepted?.[i]?.values?.container_size ?? ''}` },
                          { value: 'F', label: `F${previewResult?.accepted?.[i]?.values?.container_size ?? ''}` },
                        ]}
                        onChange={(v) => v && onResolveFreightKind(i, v as 'E' | 'F')}
                        style={{
                          minWidth: 70,
                          borderColor: resolved ? 'var(--success)' : 'var(--warning)',
                          background: resolved ? 'var(--success-soft)' : 'var(--warning-soft)',
                        }}
                      />
                    ) : (
                      <span
                        title={val != null ? String(val) : undefined}
                        style={{
                          color: val == null ? 'var(--ink-3)' : 'var(--ink-2)',
                          fontSize: 12.5,
                        }}
                      >
                        {val != null
                          ? isNumeric && typeof val === 'number'
                            ? val.toLocaleString('vi-VN')
                            : String(val)
                          : '—'}
                      </span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
