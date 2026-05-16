# Driver Detail Dialog Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `DriverDetailDialog` in `DriversPage.tsx` — add an effective-date picker (defaulting to today) to the salary inline form and improve the visual layout.

**Architecture:** Replace the ad-hoc salary state (`newSalary`, `showSalaryForm`, hardcoded today) with the existing `useDriverBaseSalaryForm` hook from `@/components/payroll/useDriverBaseSalaryForm`. The dialog retains only one local state: `showSalaryForm`. Visual layout uses pill cards for vehicle/phone, a two-column form grid for amount + date, history list below, and a right-aligned footer button.

**Tech Stack:** React 18, TypeScript, Tailwind CSS + CSS custom properties (theme tokens), TanStack Query, shadcn/ui Dialog/Button/Input

---

### Task 1: Rewrite DriverDetailDialog

**Files:**
- Modify: `frontend/src/pages/accountant/DriversPage.tsx` (the `DriverDetailDialog` function only, lines 136–235)

- [ ] **Step 1: Update imports at the top of DriversPage.tsx**

Replace line 9:
```tsx
import { useDrivers, useCreateDriver, useDriverBaseSalaryHistory, useSetDriverBaseSalary } from '@/hooks/use-queries'
```
With:
```tsx
import { useDrivers, useCreateDriver } from '@/hooks/use-queries'
import { useDriverBaseSalaryForm } from '@/components/payroll/useDriverBaseSalaryForm'
```

(`useDriverBaseSalaryHistory` and `useSetDriverBaseSalary` are now encapsulated inside the hook. `DriverBaseSalary` type import on line 16 stays — it's still used in the history map.)

- [ ] **Step 2: Replace the entire DriverDetailDialog function (lines 136–235) with the redesigned version**

```tsx
function DriverDetailDialog({ driver, onClose }: { driver: Driver; onClose: () => void }) {
  const toast = useToast()
  const qc = useQueryClient()
  const [showSalaryForm, setShowSalaryForm] = useState(false)

  const form = useDriverBaseSalaryForm({
    driverId: driver.id,
    onSaved: () => setShowSalaryForm(false),
  })

  const handleVehicleChange = async (newPlate: string) => {
    try {
      await assignVehicle(driver.id, newPlate.trim())
      toast.success('Đã đổi xe')
      qc.invalidateQueries({ queryKey: ['drivers'] })
    } catch {
      toast.error('Không thể đổi xe')
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{driver.fullName ?? driver.username}</DialogTitle>
        </DialogHeader>

        {/* Info pills */}
        <div className="flex gap-3">
          <div
            className="flex items-center gap-2 flex-1 rounded-lg px-3 py-2.5"
            style={{ background: 'var(--theme-bg-tertiary)' }}
          >
            <Car size={14} style={{ color: 'var(--theme-brand-primary)' }} />
            <InlineEditable
              display={
                <span className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>
                  {driver.vehiclePlate ?? '—'}
                </span>
              }
              value={driver.vehiclePlate ?? ''}
              onSave={handleVehicleChange}
              placeholder="Biển số xe"
              editLabel="Nhấn để đổi xe"
            />
          </div>
          <div
            className="flex items-center gap-2 flex-1 rounded-lg px-3 py-2.5"
            style={{ background: 'var(--theme-bg-tertiary)' }}
          >
            <Phone size={14} style={{ color: 'var(--theme-text-muted)' }} />
            <span className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
              {driver.phone || '—'}
            </span>
          </div>
        </div>

        {/* Salary section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--theme-text-muted)' }}
            >
              Lương cơ bản
            </p>
            {!showSalaryForm && (
              <button
                onClick={() => setShowSalaryForm(true)}
                className="text-xs font-medium"
                style={{ color: 'var(--theme-brand-primary)' }}
              >
                + Điều chỉnh
              </button>
            )}
          </div>

          {form.historyLoading ? (
            <div
              className="h-5 w-32 rounded animate-pulse"
              style={{ background: 'var(--theme-bg-tertiary)' }}
            />
          ) : form.currentRate ? (
            <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              {formatCurrency(form.currentRate.baseSalary)}
              <span
                className="ml-2 text-xs font-normal"
                style={{ color: 'var(--theme-text-muted)' }}
              >
                · từ {form.currentRate.effectiveFrom}
              </span>
            </p>
          ) : (
            <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
              Chưa thiết lập
            </p>
          )}

          {showSalaryForm && (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: 'var(--theme-text-muted)' }}
                  >
                    Số tiền (VND)
                  </label>
                  <Input
                    inputMode="numeric"
                    value={form.fields.baseSalary}
                    onChange={e => form.setBaseSalary(e.target.value)}
                    placeholder="8.000.000"
                    className="h-9 text-sm font-mono"
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: 'var(--theme-text-muted)' }}
                  >
                    Hiệu lực từ
                  </label>
                  <Input
                    type="date"
                    value={form.fields.effectiveFrom}
                    onChange={e => form.setEffectiveFrom(e.target.value)}
                    className="h-9 text-sm font-mono"
                  />
                </div>
              </div>
              {form.error && (
                <p
                  className="text-xs"
                  style={{ color: 'var(--theme-status-error)' }}
                  role="alert"
                >
                  {form.error}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setShowSalaryForm(false); form.reset() }}
                >
                  Huỷ
                </Button>
                <Button
                  size="sm"
                  onClick={form.submit}
                  disabled={form.submitting || !form.fields.baseSalary}
                  style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
                >
                  {form.submitting ? 'Đang lưu…' : 'Lưu'}
                </Button>
              </div>
            </div>
          )}

          {form.history.length > 0 && (
            <div className="space-y-1 pt-1">
              <p
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: 'var(--theme-text-muted)' }}
              >
                Lịch sử
              </p>
              {form.history.slice(0, 5).map((s: DriverBaseSalary) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between text-xs"
                  style={{ color: 'var(--theme-text-muted)' }}
                >
                  <span>{formatCurrency(s.baseSalary)}</span>
                  <span>từ {s.effectiveFrom}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles cleanly**

```bash
cd /Users/dev/Documents/projects/vantaiphucloc/frontend && npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors. If there are errors, fix them before committing.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/accountant/DriversPage.tsx
git commit -m "feat: redesign DriverDetailDialog — effective date picker, pill layout, use useDriverBaseSalaryForm"
```
