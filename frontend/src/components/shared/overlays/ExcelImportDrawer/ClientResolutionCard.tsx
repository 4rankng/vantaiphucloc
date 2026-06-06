import { useState, useEffect } from 'react'
import { X, AlertCircle, UserPlus, Plus, Loader2 } from 'lucide-react'
import { InlineSelect } from '@/components/shared/forms/InlineSelect'
import { Button } from '@/components/ui'
import { type Client } from '@/data/domain'

type ClientFormData = Omit<Client, 'id'>

const VN_TAX_RE = /^\d{10}(\d{3})?$/

const EMPTY_CLIENT_FORM: ClientFormData = {
  code: '',
  name: '',
  type: 'company',
  phone: '',
  taxCode: '',
  address: '',
  contactPerson: '',
  isActive: true,
  createdAt: undefined,
  updatedAt: undefined,
}

interface ClientResolutionCardProps {
  excelClientName: string | null
  clientId: string
  onClientIdChange: (id: string) => void
  clients: { id: number | string; name: string }[]
  createClientMutate: (data: ClientFormData) => Promise<{ id: number | string } | null>
  isCreating: boolean
  onError: (message: string) => void
}

export function ClientResolutionCard({
  excelClientName,
  clientId,
  onClientIdChange,
  clients,
  createClientMutate,
  isCreating,
  onError,
}: ClientResolutionCardProps) {
  const [creatingClient, setCreatingClient] = useState(false)
  const [clientForm, setClientForm] = useState<ClientFormData>(EMPTY_CLIENT_FORM)
  const [clientFormErrors, setClientFormErrors] = useState<{ name?: string; phone?: string; taxCode?: string }>({})

  const updateClientField = <K extends keyof ClientFormData>(key: K, value: ClientFormData[K]) => {
    setClientForm(prev => ({ ...prev, [key]: value }))
    if (key === 'name' || key === 'phone' || key === 'taxCode') {
      setClientFormErrors(prev => ({ ...prev, [key]: undefined }))
    }
  }

  function openCreateClient() {
    setClientForm({
      ...EMPTY_CLIENT_FORM,
      name: excelClientName ?? '',
    })
    setClientFormErrors({})
    setCreatingClient(true)
  }

  function cancelCreateClient() {
    setCreatingClient(false)
    setClientForm(EMPTY_CLIENT_FORM)
    setClientFormErrors({})
  }

  async function handleSaveNewClient() {
    const errs: typeof clientFormErrors = {}
    if (!clientForm.name.trim()) errs.name = 'Vui lòng nhập tên'
    if (clientForm.taxCode && !VN_TAX_RE.test(clientForm.taxCode)) {
      errs.taxCode = 'MST phải 10 hoặc 13 chữ số'
    }
    if (Object.keys(errs).length > 0) {
      setClientFormErrors(errs)
      return
    }
    try {
      const payload = {
        ...clientForm,
        name: clientForm.name.trim(),
      }
      const res = await createClientMutate(payload)
      if (res) {
        onClientIdChange(String(res.id))
        setCreatingClient(false)
        setClientForm(EMPTY_CLIENT_FORM)
        setClientFormErrors({})
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Lỗi khi tạo khách hàng')
    }
  }

  // Pre-fill form with detected name when entering preview step
  useEffect(() => {
    if (!clientId && excelClientName && !creatingClient) {
      setClientForm(prev => prev.name ? prev : { ...EMPTY_CLIENT_FORM, name: excelClientName })
    }
  }, [clientId, excelClientName, creatingClient])

  return (
    <div
      className="overflow-hidden"
      style={{
        background: 'var(--warning-soft)',
        borderRadius: 'var(--r-md, var(--r-sm))',
        border: '1px solid var(--warning)',
      }}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ minHeight: 52 }}>
        <div
          className="grid place-items-center shrink-0"
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'color-mix(in srgb, var(--warning) 18%, transparent)',
            color: 'var(--warning)',
          }}
        >
          <AlertCircle className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="m-0 text-[13.5px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis"
            style={{ color: 'var(--ink)' }}
          >
            Xác nhận chủ hàng{' '}
            <span style={{ color: 'var(--warning)' }}>&quot;{excelClientName}&quot;</span>
          </p>
          <p
            className="m-0 mt-0.5 text-[12px]"
            style={{ color: 'var(--ink-2)' }}
          >
            {creatingClient
              ? 'Nhập thông tin chủ hàng mới để lưu vào danh bạ.'
              : 'Chọn chủ hàng có sẵn hoặc tạo mới với đầy đủ thông tin.'}
          </p>
        </div>
        {creatingClient && (
          <button
            type="button"
            onClick={cancelCreateClient}
            className="grid place-items-center rounded-md shrink-0"
            style={{ width: 28, height: 28, color: 'var(--ink-3)' }}
            aria-label="Huỷ tạo mới"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Body — either select row OR inline form */}
      {!creatingClient ? (
        <div
          className="px-4 pb-4 flex items-stretch gap-2"
          style={{ borderTop: '1px solid color-mix(in srgb, var(--warning) 25%, transparent)', paddingTop: 12 }}
        >
          <div className="flex-1 min-w-0" style={{ maxWidth: 360 }}>
            <InlineSelect
              placeholder="Chọn chủ hàng có sẵn..."
              value={clientId}
              options={clients.map(c => ({ value: String(c.id), label: c.name }))}
              onChange={onClientIdChange}
              onCreateNew={openCreateClient}
              createNewLabel={`Tạo mới "${excelClientName}"`}
            />
          </div>
          <span
            className="self-center text-[12px] font-medium px-1"
            style={{ color: 'var(--ink-3)' }}
          >
            hoặc
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={openCreateClient}
            style={{
              color: 'var(--warning)',
              borderColor: 'var(--warning)',
            }}
          >
            <UserPlus className="h-4 w-4" />
            Thêm chủ hàng mới
          </Button>
        </div>
      ) : (
        <div
          className="px-4 pb-4 pt-3"
          style={{
            background: 'var(--surface)',
            borderTop: '1px solid color-mix(in srgb, var(--warning) 25%, transparent)',
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            {/* Tên + Mã KH */}
            <div className="col-span-2 grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="nepo-field-label">
                  Tên chủ hàng <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  className="nepo-input"
                  value={clientForm.name}
                  onChange={e => updateClientField('name', e.target.value)}
                  placeholder="Ví dụ: Công ty TNHH PAN"
                  autoFocus
                />
                {clientFormErrors.name && (
                  <p className="text-[12px] mt-1 m-0" style={{ color: 'var(--danger)' }}>
                    {clientFormErrors.name}
                  </p>
                )}
              </div>
              <div>
                <label className="nepo-field-label">Mã KH</label>
                <input
                  className="nepo-input"
                  value={clientForm.code ?? ''}
                  onChange={e => updateClientField('code', e.target.value)}
                  placeholder="VD: PAN"
                />
              </div>
            </div>

            {/* Loại */}
            <div className="col-span-2">
              <label className="nepo-field-label">Loại chủ hàng</label>
              <div
                className="grid grid-cols-2 gap-1 p-1"
                style={{
                  background: 'var(--surface-2)',
                  borderRadius: 'var(--r-sm)',
                  border: '1px solid var(--line)',
                }}
              >
                {(['company', 'individual'] as const).map(t => {
                  const active = clientForm.type === t
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => updateClientField('type', t)}
                      className="py-2 text-[13px] font-medium transition-colors rounded"
                      style={{
                        background: active ? 'var(--surface)' : 'transparent',
                        color: active ? 'var(--ink)' : 'var(--ink-2)',
                        boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                      }}
                    >
                      {t === 'company' ? 'Công ty' : 'Cá nhân'}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Điện thoại */}
            <div>
              <label className="nepo-field-label">Điện thoại</label>
              <input
                className="nepo-input"
                value={clientForm.phone}
                onChange={e => updateClientField('phone', e.target.value)}
                placeholder="0912345678"
                inputMode="tel"
              />
              {clientFormErrors.phone && (
                <p className="text-[12px] mt-1 m-0" style={{ color: 'var(--danger)' }}>
                  {clientFormErrors.phone}
                </p>
              )}
            </div>

            {/* Mã số thuế */}
            <div>
              <label className="nepo-field-label">Mã số thuế</label>
              <input
                className="nepo-input"
                value={clientForm.taxCode ?? ''}
                onChange={e => updateClientField('taxCode', e.target.value)}
                placeholder="0123456789"
                inputMode="numeric"
              />
              {clientFormErrors.taxCode && (
                <p className="text-[12px] mt-1 m-0" style={{ color: 'var(--danger)' }}>
                  {clientFormErrors.taxCode}
                </p>
              )}
            </div>

            {/* Địa chỉ */}
            <div className="col-span-2">
              <label className="nepo-field-label">Địa chỉ</label>
              <input
                className="nepo-input"
                value={clientForm.address ?? ''}
                onChange={e => updateClientField('address', e.target.value)}
                placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
              />
            </div>

            {/* Người liên hệ */}
            <div className="col-span-2">
              <label className="nepo-field-label">Người liên hệ</label>
              <input
                className="nepo-input"
                value={clientForm.contactPerson ?? ''}
                onChange={e => updateClientField('contactPerson', e.target.value)}
                placeholder="Họ tên người liên hệ"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={cancelCreateClient} disabled={isCreating}>
              Huỷ
            </Button>
            <Button
              size="sm"
              onClick={handleSaveNewClient}
              disabled={!clientForm.name.trim() || isCreating}
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {isCreating ? 'Đang lưu...' : 'Lưu chủ hàng'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
