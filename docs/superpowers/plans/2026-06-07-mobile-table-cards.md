# Mobile-Friendly Table Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all accountant table pages presentable and elegant on mobile by replacing horizontal-scroll tables with card layouts below 768px.

**Architecture:** Each page adds `useIsMobile(768)` branching — mobile gets vertical card stack, desktop keeps existing table. Card components live in shared component library (`components/shared/cards/`) following the existing `DriverMobileCards` pattern. All cards share consistent design tokens: `p-4 rounded-xl border`, `active:scale-[0.99] touch-manipulation`, themed backgrounds.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide icons, CSS custom properties

---

## File Structure

### New files (shared card components)
- `frontend/src/components/shared/cards/DeliveredTripMobileCard/DeliveredTripMobileCard.tsx` — DoiSoatPage trip card
- `frontend/src/components/shared/cards/SalaryMobileCard/SalaryMobileCard.tsx` — SalaryPage driver salary card
- `frontend/src/components/shared/cards/PnLMobileCard/PnLMobileCard.tsx` — PnLPage vehicle profit card
- `frontend/src/components/shared/cards/VehicleExpenseMobileCard/VehicleExpenseMobileCard.tsx` — VehicleExpensesPage expense card

### Modified files
- `frontend/src/pages/accountant/DoiSoatPage.tsx` — add isMobile branching
- `frontend/src/pages/accountant/SalaryPage.tsx` — add isMobile branching
- `frontend/src/pages/accountant/PnLPage.tsx` — add isMobile branching
- `frontend/src/pages/accountant/VehicleExpensesPage.tsx` — add isMobile branching
- `frontend/src/components/shared/index.ts` — re-export new card components

### Deferred (complex inline-edit tables)
- RoutePricingPage — 12 columns with grouped sections + inline cell editing; overflow-x-auto acceptable for now
- VendorRoutePricingPage — 9 columns with inline editing; overflow-x-auto acceptable for now
- TransportersPage vehicle table — only 3 columns, works fine with overflow

---

## Task 1: DoiSoatPage Mobile Cards

**Priority:** CRITICAL — 16 columns, 1000px min-width, user's specific example

**Files:**
- Create: `frontend/src/components/shared/cards/DeliveredTripMobileCard/DeliveredTripMobileCard.tsx`
- Create: `frontend/src/components/shared/cards/DeliveredTripMobileCard/index.ts`
- Modify: `frontend/src/pages/accountant/DoiSoatPage.tsx`

- [ ] **Step 1: Create DeliveredTripMobileCard component**

Card layout per trip:
```
┌─────────────────────────────────────┐
│ [Status]  Cont#ABC123    [actions]  │
│ KH001 · 15/06/2026                  │
│ Cát Lái → Bình Dương               │
│ ─── details ───────────────────────│
│ Nguyễn Văn A · 51C-1234 · Số tàu   │
│ F20 · Hàng rỗng · Phúc Lộc        │
│ Cước 1,200,000   Lương 500,000     │
│ Ghi chú: ...                        │
└─────────────────────────────────────┘
```

- Status badge: `Đã ghép` (green) or `Chờ ghép` (amber)
- Cont number: mono font, bold, primary color
- Route: pickup → dropoff with arrow
- Financials: two-column grid for Cước and Lương SL
- Actions: unmatch/delete buttons top-right
- Tap card → opens detail drawer (same as desktop row click)

- [ ] **Step 2: Update DoiSoatPage to use isMobile branching**

Add `const isMobile = useIsMobile(768)` and render cards instead of DataTable when mobile. Hide the legend/hint text. Hide the keyboard scroll hint.

- [ ] **Step 3: Verify TypeScript compilation**

Run: `cd frontend && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: mobile card view for DoiSoatPage reconciliation table"
```

---

## Task 2: SalaryPage Mobile Cards

**Files:**
- Create: `frontend/src/components/shared/cards/SalaryMobileCard/SalaryMobileCard.tsx`
- Create: `frontend/src/components/shared/cards/SalaryMobileCard/index.ts`
- Modify: `frontend/src/pages/accountant/SalaryPage.tsx`

- [ ] **Step 1: Create SalaryMobileCard component**

Card layout per driver:
```
┌─────────────────────────────────────┐
│ [Driver icon]  Nguyễn Văn A        │
│ 15 chuyến                          │
│ ─── financials ────────────────────│
│ Lương CB    8,000,000              │
│ Lương SL    3,500,000              │
│ Phụ cấp     500,000    [edit]      │
│ ──────────────────────────────────│
│ Thực lĩnh   12,000,000             │
└─────────────────────────────────────┘
```

- Inline edit on Phụ cap field (same as desktop)
- Money values in mono font
- Thực lĩnh highlighted with accent color

- [ ] **Step 2: Update SalaryPage isMobile branching**

- [ ] **Step 3: Verify + Commit**

---

## Task 3: PnLPage Mobile Cards

**Files:**
- Create: `frontend/src/components/shared/cards/PnLMobileCard/PnLMobileCard.tsx`
- Create: `frontend/src/components/shared/cards/PnLMobileCard/index.ts`
- Modify: `frontend/src/pages/accountant/PnLPage.tsx`

- [ ] **Step 1: Create PnLMobileCard component**

Card layout per vehicle:
```
┌─────────────────────────────────────┐
│ [Plate]  51C-12345                  │
│ ─── financials ────────────────────│
│ Doanh thu   25,000,000             │
│ Chi phí     15,000,000             │
│ ──────────────────────────────────│
│ Lợi nhuận  10,000,000              │
└─────────────────────────────────────┘
```

- Lợi nhuận color: green if positive, red if negative
- Works for both Xe nội bộ and Xe ngoài tables
- Xe ngoài adds Nha xe field

- [ ] **Step 2: Update PnLPage isMobile branching**

Both NoiBo and NgoaiBo tables get card views. Search bar stays. KPI hero cards stay.

- [ ] **Step 3: Verify + Commit**

---

## Task 4: VehicleExpensesPage Mobile Cards

**Files:**
- Create: `frontend/src/components/shared/cards/VehicleExpenseMobileCard/VehicleExpenseMobileCard.tsx`
- Create: `frontend/src/components/shared/cards/VehicleExpenseMobileCard/index.ts`
- Modify: `frontend/src/pages/accountant/VehicleExpensesPage.tsx`

- [ ] **Step 1: Create VehicleExpenseMobileCard component**

Two card variants:

By-vehicle summary card:
```
┌─────────────────────────────────────┐
│ [Plate]  51C-12345    5 lần        │
│ ─── breakdown ─────────────────────│
│ Xăng dầu    2,000,000              │
│ Sửa chữa    500,000                │
│ Tiền luật   300,000                │
│ Khác        200,000                │
│ ──────────────────────────────────│
│ Tổng        3,000,000              │
└─────────────────────────────────────┘
```

Audit log card:
```
┌─────────────────────────────────────┐
│ [Category pill]  Xăng dầu          │
│ 51C-12345 · 15/06/2026             │
│ 500,000 VND                        │
│ Mô tả: ...                         │
│ Tạo: 15/06/2026 10:30              │
└─────────────────────────────────────┘
```

- [ ] **Step 2: Update VehicleExpensesPage isMobile branching**

Both tabs (by-vehicle + audit log) get card views. KPI hero cards stay.

- [ ] **Step 3: Verify + Commit**

---

## Task 5: Final Verification

- [ ] **Step 1: TypeScript compilation**

Run: `cd frontend && npx tsc --noEmit`

- [ ] **Step 2: Visual check via browser**

Use browser skill to verify each page renders correctly at mobile width (375px).

- [ ] **Step 3: Final commit if any fixes needed**
