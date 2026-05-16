# Settings Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace native select dropdowns with a polished hybrid stepper control, add a tinted period-example chip, and remove the "Mới" badge from the Settings page.

**Architecture:** Create one new shared component `DayStepperInput` (folder pattern matching all other shared components), then update `SettingsPage` to use it. No API/query changes.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide icons, CSS theme variables (`var(--theme-*)`)

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `frontend/src/components/shared/DayStepperInput/DayStepperInput.tsx` | Hybrid stepper UI (−/input/+) |
| Create | `frontend/src/components/shared/DayStepperInput/index.ts` | Re-export |
| Modify | `frontend/src/pages/accountant/SettingsPage.tsx` | Consume DayStepperInput, new info chip, remove badge |

---

### Task 1: Create DayStepperInput component

**Files:**
- Create: `frontend/src/components/shared/DayStepperInput/DayStepperInput.tsx`
- Create: `frontend/src/components/shared/DayStepperInput/index.ts`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p frontend/src/components/shared/DayStepperInput
```

- [ ] **Step 2: Write DayStepperInput.tsx**

```tsx
import { useState, useCallback } from 'react'
import { InfoTip } from '@/components/shared/InfoTip'

interface DayStepperInputProps {
  value: number
  onChange: (v: number) => void
  label: string
  hint?: string
}

function clampDay(n: number): number {
  if (n < 1) return 31
  if (n > 31) return 1
  return n
}

export function DayStepperInput({ value, onChange, label, hint }: DayStepperInputProps) {
  const [draft, setDraft] = useState<string | null>(null)

  const handleBlur = useCallback(() => {
    if (draft === null) return
    const parsed = parseInt(draft, 10)
    const safe = isNaN(parsed) ? value : Math.min(31, Math.max(1, parsed))
    setDraft(null)
    onChange(safe)
  }, [draft, value, onChange])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDraft(e.target.value)
  }, [])

  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
        {label}
        {hint && <InfoTip text={hint} />}
      </label>
      <div
        className="flex items-center rounded-lg border overflow-hidden"
        style={{ background: 'var(--theme-bg-primary)', borderColor: 'var(--theme-border-default)' }}
      >
        <button
          type="button"
          aria-label="Giảm ngày"
          onClick={() => onChange(clampDay(value - 1))}
          className="px-2.5 py-2 text-sm font-medium transition-colors select-none"
          style={{ color: 'var(--theme-text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--theme-bg-tertiary)')}
          onMouseLeave={e => (e.currentTarget.style.background = '')}
        >
          −
        </button>
        <input
          type="text"
          inputMode="numeric"
          value={draft ?? String(value)}
          onChange={handleChange}
          onBlur={handleBlur}
          className="w-10 text-center text-sm font-semibold bg-transparent outline-none py-2"
          style={{ color: 'var(--theme-text-primary)' }}
        />
        <button
          type="button"
          aria-label="Tăng ngày"
          onClick={() => onChange(clampDay(value + 1))}
          className="px-2.5 py-2 text-sm font-medium transition-colors select-none"
          style={{ color: 'var(--theme-text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--theme-bg-tertiary)')}
          onMouseLeave={e => (e.currentTarget.style.background = '')}
        >
          +
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write index.ts**

```ts
export { DayStepperInput } from './DayStepperInput'
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep DayStepperInput
```

Expected: no output (no errors for this file).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/shared/DayStepperInput
git commit -m "feat: add DayStepperInput shared component"
```

---

### Task 2: Update SettingsPage

**Files:**
- Modify: `frontend/src/pages/accountant/SettingsPage.tsx`

- [ ] **Step 1: Replace the file content**

Full replacement of `frontend/src/pages/accountant/SettingsPage.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { Calendar, AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button } from '@/components/ui'
import { AccountantPageShell } from '@/components/shared/AccountantPageShell'
import { DashboardSectionHeader } from '@/components/shared/DashboardSectionHeader'
import { DayStepperInput } from '@/components/shared/DayStepperInput'
import { PulseHint } from '@/components/shared/PulseHint'
import { useSalaryConfig, useUpdateSalaryConfig } from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { useQueryClient } from '@tanstack/react-query'

function periodExample(fromDay: number, toDay: number) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  const startMonth = fromDay > toDay ? (m === 1 ? 12 : m - 1) : m
  const startYear = fromDay > toDay && m === 1 ? y - 1 : y
  const endMonth = fromDay > toDay ? m : m
  const endYear = fromDay > toDay ? y : y
  return `${String(fromDay).padStart(2, '0')}/${String(startMonth).padStart(2, '0')}/${startYear} → ${String(toDay).padStart(2, '0')}/${String(endMonth).padStart(2, '0')}/${endYear}`
}

export function SettingsPage() {
  const toast = useToast()
  const qc = useQueryClient()
  const { data: config, isLoading } = useSalaryConfig()
  const updateConfig = useUpdateSalaryConfig()

  const [fromDay, setFromDay] = useState(26)
  const [toDay, setToDay] = useState(25)
  const [dirty, setDirty] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    if (config) {
      setFromDay(config.fromDay)
      setToDay(config.toDay)
    }
  }, [config])

  useEffect(() => {
    if (config) {
      setDirty(config.fromDay !== fromDay || config.toDay !== toDay)
    }
  }, [fromDay, toDay, config])

  const handleSave = () => setShowConfirm(true)

  const handleConfirmSave = () => {
    updateConfig.mutate({ from_day: fromDay, to_day: toDay }, {
      onSuccess: () => {
        toast.success('Đã cập nhật kỳ lương')
        setShowConfirm(false)
        qc.invalidateQueries()
      },
      onError: () => toast.error('Không thể cập nhật'),
    })
  }

  return (
    <AccountantPageShell title="Thiết lập" subtitle="Cấu hình kỳ lương và thông số hệ thống" icon={Calendar}>
      <div className="rounded-xl border overflow-hidden" style={{
        background: 'var(--theme-bg-secondary)',
        borderColor: 'var(--theme-border-default)',
        boxShadow: '0 0 0 1px rgba(9,9,11,0.03), 0 1px 3px rgba(9,9,11,0.06), 0 4px 16px -4px rgba(9,9,11,0.05)',
      }}>
        <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
          <DashboardSectionHeader title="Kỳ lương" icon={Calendar} />
        </div>

        {isLoading ? (
          <div className="p-5 space-y-4">
            <div className="h-10 rounded animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
            <div className="h-10 rounded animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
          </div>
        ) : (
          <div className="p-5 space-y-5">
            <div className="flex items-end gap-4">
              <DayStepperInput
                value={fromDay}
                onChange={setFromDay}
                label="Ngày bắt đầu"
                hint="Ngày đầu tiên của kỳ lương"
              />
              <span className="pb-2.5 text-base" style={{ color: 'var(--theme-text-muted)' }}>→</span>
              <DayStepperInput
                value={toDay}
                onChange={setToDay}
                label="Ngày kết thúc"
                hint="Ngày cuối cùng của kỳ lương"
              />
            </div>

            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2.5"
              style={{
                background: 'color-mix(in srgb, var(--theme-brand-primary) 6%, transparent)',
                border: '1px solid color-mix(in srgb, var(--theme-brand-primary) 15%, transparent)',
              }}
            >
              <Calendar className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--theme-brand-primary)', opacity: 0.7 }} />
              <span className="text-xs font-medium" style={{ color: 'var(--theme-text-secondary)' }}>
                Ví dụ: kỳ 04/2026 = {periodExample(fromDay, toDay)}
              </span>
            </div>

            {dirty && (
              <div
                className="flex items-start gap-3 rounded-lg px-4 py-3 transition-all animate-fade-in"
                style={{
                  background: 'color-mix(in srgb, var(--theme-status-warning) 8%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--theme-status-warning) 20%, transparent)',
                }}
              >
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--theme-status-warning)' }} />
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--theme-status-warning)' }}>Thay đổi ảnh hưởng</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-secondary)' }}>
                    Lương tài xế · P&L Tổng quan · Bảng kê thanh toán
                  </p>
                </div>
              </div>
            )}

            {dirty && (
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => { setFromDay(config?.fromDay ?? 26); setToDay(config?.toDay ?? 25) }} className="text-sm">
                  Huỷ
                </Button>
                <PulseHint hintKey="settings-save">
                  <Button onClick={handleSave} className="text-sm" style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
                    Lưu thay đổi
                  </Button>
                </PulseHint>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Xác nhận thay đổi kỳ lương?</DialogTitle></DialogHeader>
          <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            Kỳ lương mới: ngày {fromDay} → ngày {toDay} hàng tháng. Tất cả dữ liệu tổng quan sẽ được tính lại theo kỳ mới.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)} className="flex-1">Huỷ</Button>
            <Button onClick={handleConfirmSave} className="flex-1" style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AccountantPageShell>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "SettingsPage|DayStepperInput"
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/accountant/SettingsPage.tsx
git commit -m "feat: redesign SettingsPage — stepper inputs, info chip, remove Mới badge"
```

---

## Self-Review

**Spec coverage:**
- ✅ `DayStepperInput`: −/input/+ stepper, editable text input, clamp 1–31 on blur, wrapping on button click
- ✅ InfoTip on both labels
- ✅ Period example → tinted info chip with brand colour
- ✅ "Mới" / Sparkles badge removed
- ✅ Section card pattern (header strip + content area) preserved
- ✅ All existing save/cancel/confirm/warning logic unchanged

**Placeholder scan:** No TBD, no TODO, all code blocks complete.

**Type consistency:** `DayStepperInput` props defined in Task 1, consumed identically in Task 2. `clampDay` defined and used only in Task 1. `periodExample` kept from original, no changes to signature.
