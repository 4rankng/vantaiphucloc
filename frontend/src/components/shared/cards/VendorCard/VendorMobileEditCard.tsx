import { useState, memo } from 'react'
import { Button } from '@/components/ui'
import type { VendorFormData } from './types'
import { validateTaxCode } from './types'

interface VendorMobileEditCardProps {
  initial: VendorFormData
  onSave: (data: VendorFormData) => void
  onCancel: () => void
  saving?: boolean
}

export const VendorMobileEditCard = memo(function VendorMobileEditCard({
  initial,
  onSave,
  onCancel,
  saving,
}: VendorMobileEditCardProps) {
  const [name, setName] = useState(initial.name)
  const [type, setType] = useState(initial.type)
  const [phone, setPhone] = useState(initial.phone)
  const [taxCode, setTaxCode] = useState(initial.taxCode)
  const [address, setAddress] = useState(initial.address)
  const [contactPerson, setContactPerson] = useState(initial.contactPerson)

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSave = () => {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Bắt buộc'
    const taxErr = validateTaxCode(taxCode)
    if (taxErr) errs.taxCode = taxErr
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    onSave({ name, type, phone, taxCode, address, contactPerson })
  }

  return (
    <div
      className="p-4 rounded-xl border flex flex-col gap-4 animate-scale-pop text-left"
      style={{
        background: 'var(--accent-soft)',
        borderColor: 'var(--accent)',
      }}
    >
      <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--accent-ink)' }}>
        {initial.name ? 'Chỉnh sửa nhà thầu' : 'Thêm nhà thầu mới'}
      </h3>

      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--ink-2)' }}>Tên nhà thầu *</label>
          <input
            className="nepo-input text-xs w-full"
            style={{ borderColor: errors.name ? 'var(--theme-status-error, #E32434)' : undefined }}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Tên nhà thầu"
          />
          {errors.name && <p className="text-[10px]" style={{ color: 'var(--theme-status-error, #E32434)' }}>{errors.name}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--ink-2)' }}>Loại</label>
          <div className="flex gap-2">
            {(['company', 'individual'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className="flex-1 rounded py-1.5 text-xs font-medium transition-colors border"
                style={{
                  background: type === t ? 'var(--accent)' : 'var(--surface)',
                  color: type === t ? 'var(--theme-text-on-brand)' : 'var(--ink-2)',
                  borderColor: type === t ? 'var(--accent)' : 'var(--theme-border-default)',
                }}
              >
                {t === 'company' ? 'Công ty' : 'Cá nhân'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--ink-2)' }}>Số điện thoại</label>
          <input
            className="nepo-input text-xs w-full"
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="Số điện thoại"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--ink-2)' }}>Địa chỉ</label>
          <input
            className="nepo-input text-xs w-full"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="Địa chỉ"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--ink-2)' }}>Người liên hệ</label>
          <input
            className="nepo-input text-xs w-full"
            value={contactPerson}
            onChange={e => setContactPerson(e.target.value)}
            placeholder="Người liên hệ"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--ink-2)' }}>Mã số thuế</label>
          <input
            className="nepo-input text-xs w-full"
            style={{ borderColor: errors.taxCode ? 'var(--theme-status-error, #E32434)' : undefined }}
            value={taxCode}
            onChange={e => setTaxCode(e.target.value)}
            placeholder="Mã số thuế"
          />
          {errors.taxCode && <p className="text-[10px]" style={{ color: 'var(--theme-status-error, #E32434)' }}>{errors.taxCode}</p>}
        </div>
      </div>

      <div className="flex gap-2 justify-end mt-1 pt-3 border-t" style={{ borderColor: 'var(--theme-border-default)' }}>
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>Hủy</Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Đang lưu...' : 'Xác nhận'}
        </Button>
      </div>
    </div>
  )
})
