import { useState, useCallback, useMemo, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Plus, Route, FileSpreadsheet, ArrowLeft, RefreshCw, Search, SlidersHorizontal, Users, Boxes, Cable, Shuffle } from 'lucide-react'
import { Button } from '@/components/ui'
import { InlineSelect } from '@/components/shared/forms/InlineSelect/InlineSelect'
import { DangerConfirmDialog } from '@/components/shared/overlays/DangerConfirmDialog/DangerConfirmDialog'
import { RoutePricingTable, type RoutePricingFormData, type ClientGroup } from '@/components/route-pricing/RoutePricingTable'
import { RoutePricingDialog } from '@/components/route-pricing/RoutePricingDialog'
import { RoutePricingImportDialog } from '@/components/route-pricing/RoutePricingImportDialog'
import { useRoutePricing } from '@/components/route-pricing/useRoutePricing'
import { WORK_TYPE_LABELS } from '@/data/domain'
import type { WorkType, RoutePricing } from '@/data/domain'
import type { RoutePricingUpdatePayload } from '@/services/api/routePricings.api'
import { LinkButton, SyncPricingDialog } from '@/components/shared'
import { useSyncAllPricing } from '@/hooks/use-queries'
import { useToast } from '@/components/atoms'
import { useIsMobile } from '@/hooks/use-mobile'

export function RoutePricingPage() {
  const { pathname } = useLocation()
  const backTo = pathname.startsWith('/accountant') ? '/accountant/settings'
    : pathname.startsWith('/superadmin') ? '/superadmin/settings'
    : undefined
  const backToLink = backTo
    ? <LinkButton to={backTo} icon={ArrowLeft} variant="muted">Thiết lập</LinkButton>
    : null
  const isMobile = useIsMobile(768)
  const [importOpen, setImportOpen] = useState(false)
  const [syncOpen, setSyncOpen] = useState(false)
  const [inlineEditId, setInlineEditId] = useState<number | null>(null)
  const [routeSearch, setRouteSearch] = useState('')
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null)

  const { toast } = useToast()
  const syncAllPricing = useSyncAllPricing()

  const handleConfirmSync = useCallback(() => {
    syncAllPricing.mutate(undefined, {
      onSuccess: (data) => {
        toast({
          title: 'Đồng bộ thành công',
          description: `Đã cập nhật cước/lương cho ${data.updatedCount} chuyến.`,
          variant: 'success',
        })
        setSyncOpen(false)
      },
      onError: (err) => {
        toast({
          title: 'Đồng bộ thất bại',
          description: err.message || 'Đã có lỗi xảy ra khi đồng bộ.',
          variant: 'error',
        })
      },
    })
  }, [syncAllPricing, toast])

  const [inlineEditField, setInlineEditField] = useState<
    'clientId' | 'pickupLocationId' | 'dropoffLocationId' | 'workType' | 'f20Price' | 'f40Price' | 'e20Price' | 'e40Price' | 'f20DriverSalary' | 'f40DriverSalary' | 'e20DriverSalary' | 'e40DriverSalary'
  >('f20Price')
  const [inlineEditInitial, setInlineEditInitial] = useState<RoutePricingFormData | undefined>()

  const {
    routePricings,
    isLoading,
    clients,
    locations,
    clientId,
    setClientId,
    workType,
    setWorkType,
    dialogOpen,
    setDialogOpen,
    editingId,
    form,
    setForm,
    deleteId,
    setDeleteId,
    openCreate,
    openEdit,
    handleSubmit,
    handleDelete,
    updateItem,
    isSubmitting,
    isUpdating,
  } = useRoutePricing()

  // ─── Group route pricings by client ──────────────────────────────────────

  const filteredRoutePricings = useMemo(() => {
    const term = routeSearch.trim().toLowerCase()
    if (!term) return routePricings
    return routePricings.filter(rp => {
      const haystack = [
        rp.client.name,
        rp.client.code ?? '',
        rp.pickupLocation.name,
        rp.dropoffLocation.name,
        WORK_TYPE_LABELS[rp.workType] ?? rp.workType,
      ].join(' ').toLowerCase()
      return haystack.includes(term)
    })
  }, [routePricings, routeSearch])

  const groups = useMemo<ClientGroup[]>(() => {
    const map = new Map<number, ClientGroup>()
    for (const rp of filteredRoutePricings) {
      const existing = map.get(rp.client.id)
      if (existing) {
        existing.routes.push(rp)
        existing.routeCount++
      } else {
        map.set(rp.client.id, {
          clientId: rp.client.id,
          clientName: rp.client.name,
          clientCode: rp.client.code ?? null,
          routeCount: 1,
          routes: [rp],
        })
      }
    }
    return Array.from(map.values()).sort((a, b) => a.clientName.localeCompare(b.clientName, 'vi'))
  }, [filteredRoutePricings])

  // ─── Expand/collapse state ───────────────────────────────────────────────

  const [expandedClients, setExpandedClients] = useState<Set<number>>(new Set())

  // Auto-expand when filtering to a specific client
  useEffect(() => {
    if (clientId) {
      setExpandedClients(new Set([clientId]))
      setSelectedClientId(clientId)
    }
  }, [clientId])

  useEffect(() => {
    if (!groups.length) {
      setSelectedClientId(null)
      return
    }
    setSelectedClientId(prev => {
      if (prev && groups.some(group => group.clientId === prev)) return prev
      return groups[0].clientId
    })
  }, [groups])

  const toggleClient = useCallback((id: number) => {
    setExpandedClients(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const expandAll = useCallback(() => {
    setExpandedClients(new Set(groups.map(g => g.clientId)))
  }, [groups])

  const collapseAll = useCallback(() => {
    setExpandedClients(new Set())
  }, [])

  // ─── Inline edit handlers ────────────────────────────────────────────────

  const handleStartEdit = useCallback((rp: RoutePricing, field?: typeof inlineEditField) => {
    setInlineEditId(rp.id)
    setInlineEditField(field ?? 'f20Price')
    setInlineEditInitial({
      clientId: rp.client.id,
      pickupLocationId: rp.pickupLocation.id,
      dropoffLocationId: rp.dropoffLocation.id,
      workType: rp.workType,
      f20Price: rp.f20Price?.toString() ?? '',
      f40Price: rp.f40Price?.toString() ?? '',
      e20Price: rp.e20Price?.toString() ?? '',
      e40Price: rp.e40Price?.toString() ?? '',
      f20DriverSalary: rp.f20DriverSalary?.toString() ?? '',
      f40DriverSalary: rp.f40DriverSalary?.toString() ?? '',
      e20DriverSalary: rp.e20DriverSalary?.toString() ?? '',
      e40DriverSalary: rp.e40DriverSalary?.toString() ?? '',
    })
    // Auto-expand the group containing this row
    setExpandedClients(prev => {
      if (prev.has(rp.client.id)) return prev
      const next = new Set(prev)
      next.add(rp.client.id)
      return next
    })
  }, [])

  const handleSaveInline = useCallback((id: number, data: RoutePricingFormData) => {
    const parsePrice = (v: string) => {
      if (!v.trim()) return null
      const n = parseInt(v.replace(/[^0-9]/g, ''), 10)
      return isNaN(n) ? null : n
    }
    const payload: RoutePricingUpdatePayload = {
      clientId: data.clientId,
      pickupLocationId: data.pickupLocationId,
      dropoffLocationId: data.dropoffLocationId,
      workType: data.workType,
      f20Price: parsePrice(data.f20Price),
      f40Price: parsePrice(data.f40Price),
      e20Price: parsePrice(data.e20Price),
      e40Price: parsePrice(data.e40Price),
      f20DriverSalary: parsePrice(data.f20DriverSalary),
      f40DriverSalary: parsePrice(data.f40DriverSalary),
      e20DriverSalary: parsePrice(data.e20DriverSalary),
      e40DriverSalary: parsePrice(data.e40DriverSalary),
    }
    updateItem(id, payload, { onSuccess: () => setInlineEditId(null) })
  }, [updateItem])

  const handleCancelInline = useCallback(() => setInlineEditId(null), [])

  // ─── Mobile edit dialog opener ─────────────────────────────────────────────

  const handleEditOpenDialog = useCallback((rp: RoutePricing) => {
    openEdit(rp)
  }, [openEdit])

  // ─── Filter options ──────────────────────────────────────────────────────

  const workTypeOptions = [
    { value: 'all', label: 'Tất cả tác nghiệp' },
    ...(Object.entries(WORK_TYPE_LABELS) as [WorkType, string][])
      .filter(([key]) => !['E20', 'E40', 'F20', 'F40'].includes(key))
      .map(([key, label]) => ({ value: key, label })),
  ]

  const clientOptions = [
    { value: 'all', label: 'Tất cả chủ hàng' },
    ...clients.map(c => ({ value: String(c.id), label: c.code ? `${c.code} – ${c.name}` : c.name })),
  ]

  const summaryStats = useMemo(() => {
    const clientCount = new Set(filteredRoutePricings.map(rp => rp.client.id)).size
    const chuyenBai = filteredRoutePricings.filter(rp => rp.workType === 'CHUYEN_BAI').length
    return {
      clients: clientCount,
      routes: filteredRoutePricings.length,
      yard: chuyenBai,
      other: Math.max(filteredRoutePricings.length - chuyenBai, 0),
    }
  }, [filteredRoutePricings])

  const clearFilters = useCallback(() => {
    setClientId(undefined)
    setWorkType(undefined)
    setRouteSearch('')
  }, [setClientId, setWorkType])

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          {backToLink && <div className="mb-4">{backToLink}</div>}
          <div className="flex min-w-0 items-center gap-4">
            {!isMobile && (
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: 'var(--theme-bg-secondary)',
                  border: '1px solid var(--theme-border-light)',
                  boxShadow: 'var(--theme-shadow-card)',
                }}
              >
                <Route className="h-7 w-7" style={{ color: 'var(--theme-brand-primary)' }} />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-2xl font-bold leading-tight md:text-3xl" style={{ color: 'var(--theme-text-primary)', letterSpacing: 0 }}>
                Bảng giá cước
              </h1>
              <p className="mt-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
                Quản lý bảng giá cước theo tuyến đường và loại hình tác nghiệp
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {!isMobile && (
            <Button variant="outline" onClick={() => setSyncOpen(true)} className="gap-1.5 whitespace-nowrap">
              <RefreshCw className="h-3.5 w-3.5" />
              Đồng bộ cước/lương
            </Button>
          )}
          {!isMobile && (
            <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-1.5 whitespace-nowrap">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Nhập Excel
            </Button>
          )}
          <Button onClick={openCreate} className="gap-1.5 whitespace-nowrap">
            <Plus className="h-3.5 w-3.5" />
            Thêm cước tuyến
          </Button>
        </div>
      </div>

      <section
        className="flex flex-col gap-3 rounded-xl p-3 lg:flex-row lg:items-center"
        style={{
          background: 'var(--theme-bg-secondary)',
          border: '1px solid var(--theme-border-default)',
          boxShadow: 'var(--theme-shadow-card)',
        }}
      >
        <div className="grid flex-1 gap-3 md:grid-cols-[auto_minmax(190px,1fr)_auto_minmax(190px,1fr)_minmax(240px,1.2fr)] md:items-center">
          <span className="hidden text-xs font-medium md:block" style={{ color: 'var(--theme-text-secondary)' }}>Chủ hàng</span>
          <InlineSelect
            placeholder="Tất cả chủ hàng"
            value={clientId ? String(clientId) : 'all'}
            options={clientOptions}
            onChange={v => setClientId(v === 'all' ? undefined : Number(v))}
            size="md"
          />
          <span className="hidden text-xs font-medium md:block" style={{ color: 'var(--theme-text-secondary)' }}>Tác nghiệp</span>
          <InlineSelect
            placeholder="Tất cả tác nghiệp"
            value={workType ?? 'all'}
            options={workTypeOptions}
            onChange={v => setWorkType(v === 'all' ? undefined : v)}
            size="md"
          />
          <div className="relative">
            <Search className="absolute h-4 w-4" style={{ left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--theme-text-muted)' }} />
            <input
              type="search"
              value={routeSearch}
              onChange={event => setRouteSearch(event.target.value)}
              placeholder="Tìm kiếm tuyến, địa điểm..."
              className="nepo-input w-full text-sm"
              style={{ height: 38, paddingLeft: 36 }}
            />
          </div>
        </div>
        <Button variant="outline" onClick={clearFilters} className="justify-center gap-1.5 whitespace-nowrap">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Bộ lọc
        </Button>
      </section>

      {isMobile ? (
        <RoutePricingTable
          data={filteredRoutePricings}
          isLoading={isLoading}
          editingId={inlineEditId}
          editingField={inlineEditField}
          onStartEdit={handleStartEdit}
          onSave={handleSaveInline}
          onCancelEdit={handleCancelInline}
          onDelete={setDeleteId}
          editInitial={inlineEditInitial}
          isSaving={isUpdating}
          clients={clients}
          locations={locations}
          groups={groups}
          expandedClients={expandedClients}
          onToggleClient={toggleClient}
          onExpandAll={expandAll}
          onCollapseAll={collapseAll}
          isMobile={isMobile}
          onEditOpenDialog={handleEditOpenDialog}
        />
      ) : (
        <RoutePricingTable
          data={filteredRoutePricings}
          isLoading={isLoading}
          editingId={inlineEditId}
          editingField={inlineEditField}
          onStartEdit={handleStartEdit}
          onSave={handleSaveInline}
          onCancelEdit={handleCancelInline}
          onDelete={setDeleteId}
          editInitial={inlineEditInitial}
          isSaving={isUpdating}
          clients={clients}
          locations={locations}
          groups={groups}
          expandedClients={expandedClients}
          onToggleClient={toggleClient}
          onExpandAll={expandAll}
          onCollapseAll={collapseAll}
          selectedClientId={selectedClientId}
          onSelectClient={setSelectedClientId}
          routeSearch={routeSearch}
        />
      )}

      <section
        className="rounded-xl p-5"
        style={{
          background: 'var(--theme-bg-secondary)',
          border: '1px solid var(--theme-border-default)',
          boxShadow: 'var(--theme-shadow-card)',
        }}
      >
        <h2 className="mb-4 text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Tổng quan bảng giá cước</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Chủ hàng', value: summaryStats.clients, icon: Users, tone: 'var(--theme-brand-primary)' },
            { label: 'Tuyến đang áp dụng', value: summaryStats.routes, icon: Boxes, tone: 'var(--theme-status-info)' },
            { label: 'Tuyến chuyển bãi', value: summaryStats.yard, icon: Cable, tone: 'var(--theme-status-warning)' },
            { label: 'Tuyến khác', value: summaryStats.other, icon: Shuffle, tone: 'var(--theme-express-color)' },
          ].map(stat => (
            <div
              key={stat.label}
              className="flex items-center gap-4 rounded-lg p-4"
              style={{ border: '1px solid var(--theme-border-light)', background: 'var(--theme-bg-primary)' }}
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                style={{ background: `color-mix(in srgb, ${stat.tone} 14%, var(--theme-bg-secondary))`, color: stat.tone }}
              >
                <stat.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xl font-bold leading-tight" style={{ color: 'var(--theme-text-primary)' }}>{stat.value}</p>
                <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Create/edit dialog */}
      <RoutePricingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingId={editingId}
        form={form}
        onFormChange={setForm}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        clients={clients}
        locations={locations}
      />

      {/* Delete confirmation */}
      <DangerConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Xoá cước tuyến?"
        entityName={
          (() => {
            const rp = routePricings.find(r => r.id === deleteId)
            return rp ? `${rp.pickupLocation.name} → ${rp.dropoffLocation.name}` : ''
          })()
        }
      />

      <RoutePricingImportDialog open={importOpen} onOpenChange={setImportOpen} />

      <SyncPricingDialog
        open={syncOpen}
        onClose={() => setSyncOpen(false)}
        isPending={syncAllPricing.isPending}
        onConfirm={handleConfirmSync}
      />
    </div>
  )
}
