# UX-OPEN-08 — Director KPI Cards Have No Loading or Error State

**Severity:** 🔵 Polish  
**Type:** Usability Issue  
**Layer:** Frontend  
**Affected Role/Flow:** giamdoc — `/director` — KPI stats row  
**Status:** ✅ Already Implemented — StatCard component accepts `loading` prop and renders skeleton placeholder (DirectorDashboard.tsx lines 536-537). QA v9 likely tested stale deployment.

---

## Issue

The director dashboard KPI cards (Tổng chuyến, Đã khớp, Chờ xử lý, Doanh thu) show numbers when loaded, but have no states for:
- **Loading** — cards appear blank/zero while data fetches; indistinguishable from "legitimately zero"
- **Error** — if the KPI API fails, cards show nothing with no indication of failure
- **Last updated** — director cannot tell if the figures are real-time or stale

**QA v9 evidence:** 0 skeleton elements, 0 `aria-busy` attributes, 0 error-state indicators found in DOM.

---

## Expected Behavior

- **Loading state:** Skeleton loader (grey animated placeholder) while data fetches — replaces the number area only, not the card structure
- **Error state:** Show "—" or a warning icon with a retry button if the API call fails
- **Optional:** "Cập nhật lúc HH:mm" timestamp below each KPI card value

---

## Recommendation

1. Wrap KPI data fetch in a React Query hook with `isLoading` and `isError` states
2. On `isLoading`: render `<Skeleton className="h-8 w-24" />` in place of the number
3. On `isError`: render `"—"` with a small ⚠️ icon and `title="Không tải được dữ liệu"`
4. Add optional `updatedAt` display below the value using the API response timestamp
