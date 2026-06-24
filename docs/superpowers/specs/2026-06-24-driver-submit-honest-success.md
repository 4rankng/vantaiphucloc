# Fix false "Gửi thành công" on driver submit when the backend is unreachable

**Status:** `pending approval` (ralplan consensus — Planner → Architect → Critic)
**Date:** 2026-06-24
**Scope:** Frontend only. No backend / DB / schema changes.
**Mode:** RALPLAN-DR short (frontend logic/UX fix; touches revenue-adjacent submit path but is not auth/security/migration/destructive).

---

## 1. Problem (verified against current code)

When a driver submits a delivered trip and the network drops (or the backend is
unreachable), the app **still shows the green "Gửi thành công" overlay and
navigates to `/driver`**, even though the server never received the trip. This is
a silent real-container data-loss vector.

Root causes in `frontend/src/pages/driver/useCreateDeliveredTrip.ts`:

- **Create mode (`confirmSubmit`, lines ~193–236):** each container is POSTed via
  `apiClient.createDeliveredTrip`, which goes through `safeRequest`
  (`frontend/src/lib/safe-request.ts:39`). A network error hits `.catch → fail()`
  and returns `{ success: false }`. On `!res.success` the code only sets
  `anyFailed = true` (line 214) — **but `setShowSuccess(true)` (line 230) runs
  regardless of `anyFailed`**. The only difference is a 3 s vs 2 s delay before
  `navigate('/driver')`. No error screen, no retry, no warning.
- **Edit mode (lines ~163–191):** `await apiClient.updateDeliveredTrip(...)` —
  its result is never checked; success overlay is shown unconditionally (same
  false-success bug for `{ success:false }` returns).
- **Offline machinery is a distraction, not a guard:** `frontend/src/lib/network.ts`
  adds `online`/`offline`/`visibilitychange` listeners + health polling, but it
  does **nothing** to queue or protect the trip POST. It only ever drove an
  offline pill — which **no longer renders** (AppTopBar.tsx:16 is a stale comment;
  `onNetworkChange`/`isFullyOnline` have zero consumers).

User decision: **remove the online/offline listeners + (already-absent) offline
pill; submit is "successful" ONLY when the backend returns a success response.**

## 2. RALPLAN-DR Summary

### Principles
1. **Truth at the UI boundary** — the success state is a function of the
   backend's confirmation, nothing else. No success without `{ success:true }`.
2. **Never lose entered data on failure** — on failure, keep all form state
   (containers, client, route, photos, notes) so the driver can retry in place.
3. **Minimal, surgical, reuse-first** — extend the existing
   `SuccessOverlay`/`Dialog` patterns; no offline queue, no IndexedDB, no new
   abstraction. (Matches `feedback_audit_before_build`, project "minimal changes".)
4. **Retry must not create duplicates** — `POST /delivered-trips` is **not
   idempotent** (`CreateDeliveredTrip.__call__` does `add → save → commit` with no
   dedup). Retry re-sends only containers the backend has NOT yet confirmed.

### Decision Drivers (top 3)
1. **Stop the data loss now** with the smallest safe change — the real failure
   mode is "no network at submit", not "background sync".
2. **Driver trust** — a green success that lies is worse than an honest error;
   drivers must know immediately and be able to resend without re-entering data.
3. **No over-engineering** — offline-first queuing is deferred (nice-to-have),
   not required to close this vector.

### Viable Options
- **Option A — Honest success/failure + in-place retry (CHOSEN).** Gate
  `setShowSuccess` on full backend confirmation; add a failure dialog that lists
  unconfirmed containers and offers "Gửi lại" (retry, failed-only) / "Đóng"
  (keep data). Remove `network.ts` + its AuthContext wiring + stale pill
  comments. Frontend-only. ~3 files.
  - *Pros:* closes the reported vector completely; minimal; no backend change;
    reuses Dialog/Button; partial success (3 of 5) handled correctly.
  - *Cons:* leaves one residual — see Risk R1.
- **Option B — Full offline queue (IndexedDB + Background Sync).** Persist
  pending submits, auto-retry when online, honest "saved offline" state.
  - *Pros:* best UX for truly out-of-coverage drivers; auto-recovery.
  - *Cons:* large scope (sw.js, persistence, conflict/idempotency story);
    violates "no nice-to-haves / minimal changes" for THIS bug; deferred.
- **Option C — Backend idempotency key** (`client_request_id` column + dedup in
  `CreateDeliveredTrip`). Makes blind retry safe; fully closes R1.
  - *Pros:* bullet-proof retry/dedup.
  - *Cons:* backend + schema change; not needed to fix the reported
    false-success bug; deferred as a hardening follow-up.

**Why A over B/C:** The reported bug is *false success on no network*, not
"sync when offline". A closes it with the least code and no backend risk. B and C
are explicitly deferred (see §6) for the user to opt into separately.

## 3. Plan (Option A)

### 3.1 Fix submit truthiness — `frontend/src/pages/driver/useCreateDeliveredTrip.ts`

**New state:**
- `submitError: { failed: Array<{ number: string | null; reason: string }> } | null`
  — populated only when ≥1 container was NOT confirmed by the backend.
- `succeededContNumbersRef = useRef(new Set<string>())` — container numbers the
  backend has confirmed this submit session; used so retry skips them (no dup).

**Create mode (`confirmSubmit`):**
- Filter `activeContainers`; loop, **skipping** any number already in
  `succeededContNumbersRef` (retry safety).
- For each: `try { const res = await apiClient.createDeliveredTrip({...}) }`.
  - `if (res.success)` → add number to `succeededContNumbersRef`; fire
    best-effort photo upload (unchanged).
  - else → push `{ number, reason: res.message ?? 'Không gửi được – thử lại' }`.
  - catch → push `{ number, reason: 'Mất kết nối – kiểm tra mạng và gửi lại' }`.
- After the loop:
  - **if `failed.length > 0`** → `setSubmitting(false)`,
    `setSubmitError({ failed })`, `invalidateDeliveredTripDeps(qc)` (so any
    partial successes surface in history), **`return`** (no green overlay, no
    navigate).
  - **else (all confirmed)** → `invalidateDeliveredTripDeps(qc)`,
    `setShowSuccess(true)`, recent vessel/note, then the existing timed
    `navigate('/driver')`.
- Expose `submitError`, and a `retrySubmit` callback:
  `() => { setSubmitError(null); void confirmSubmit() }` (re-runs the loop; the
  `succeededContNumbersRef` ensures only unconfirmed containers are re-sent).
  Expose `dismissSubmitError`: `() => { setSubmitError(null); setSubmitting(false) }`.

**Edit mode (`confirmSubmit`, isEdit branch):**
- Check the update result: `const res = await apiClient.updateDeliveredTrip(...)`.
- `if (!res.success)` → `setSubmitting(false)`,
  `setSubmitError({ failed: [{ number: firstCont?.containerNumber ?? null, reason: res.message ?? 'Không lưu được – thử lại' }] })`,
  `return`.
- Only on `res.success` → photo upload + `setShowSuccess(true)` + navigate
  (unchanged). (Network throws here already fall to the outer catch → no false
  success; only the `{success:false}` path was broken.)

### 3.2 Failure UI — new `frontend/src/components/shared/overlays/SubmitErrorDialog/`

Small dialog (reuse `Dialog`/`DialogHeader`/`DialogContent`/`DialogFooter` +
`Button` from `@/components/ui`, mirroring `DuplicateTripWarningDialog` styling):
- Title: **"Không gửi được chuyến"**; body explains the backend did not confirm
  some containers and the data is kept.
- List each failed container number + reason.
- Footer buttons **horizontal** (per `feedback_no_stacked_buttons`):
  - `Đóng` (outline) → `dismissSubmitError` (keep data, stay on page).
  - `Gửi lại` (brand) → `retrySubmit`.

Wire it in `frontend/src/pages/driver/CreateDeliveredTrip.tsx` next to
`<SuccessOverlay visible={showSuccess} />` (~line 622):
`<SubmitErrorDialog error={submitError} onRetry={retrySubmit} onClose={dismissSubmitError} />`.
Destructure `submitError, retrySubmit, dismissSubmitError` from the hook (~line 43).

### 3.3 Remove offline-listener machinery

- **Delete `frontend/src/lib/network.ts`** (online/offline/visibilitychange
  listeners, health polling, `start/stopHealthMonitor`, unused
  `onNetworkChange`/`isFullyOnline`/`checkBackendHealth`).
- **`frontend/src/contexts/AuthContext.tsx`:** remove the import (line 5), the
  `if (role === 'driver') startHealthMonitor()` call (line 44), and the
  `stopHealthMonitor()` call (line 51). Login/logout otherwise unchanged.
- **`frontend/src/components/shared/navigation/AppTopBar/AppTopBar.tsx`:** drop
  the stale `[offline]` token from the line-16 layout comment (no pill renders).
- **`frontend/src/components/ui/Toast/Toast.tsx:102`:** update the stale comment
  that references "the offline pill" (cosmetic).
- Leave `useContainerManager.ts:227` inline `!navigator.onLine` check as-is — it
  only produces an OCR error string, it is not a listener and is accurate.

## 4. Acceptance criteria (testable)

1. **No network at submit:** DevTools → Network → Offline, submit a new trip →
   **no green overlay**, **no navigation**, `SubmitErrorDialog` appears listing
   the container(s), form data (incl. photos) intact.
2. **Backend returns `{success:false}`** (e.g. validation/server rejection):
   same outcome as #1 with the server's message.
3. **All succeed:** green "Đã gửi chuyến" overlay → navigate to `/driver`
   (unchanged).
4. **Partial failure (3 of 5):** the 3 confirmed trips appear in history
   (invalidation); dialog lists only the 2 failed; `Gửi lại` re-sends **only the
   2** (the 3 are in `succeededContNumbersRef` and skipped — verified no dup in
   history/network tab).
5. **Edit mode:** update returning `{success:false}` → dialog, no false success;
   success path unchanged.
6. **Offline machinery gone:** `rg "lib/network|startHealthMonitor" frontend/src`
   → 0 hits; login + logout work; no console errors about missing listeners.
7. **Typecheck clean** (`make` / `tsc --noEmit` equivalent for frontend).

## 5. Risks

- **R1 (residual, accepted): duplicate on "commit-then-response-lost".** If the
  backend commits the trip but the HTTP response is lost, `res.success` is false,
  the container is not marked succeeded, and `Gửi lại` re-sends it → potential
  duplicate. This is **rarer** than the reported "no network at all" case and is
  detectable by the existing duplicate-check + history review. Fully closing it
  needs Option C (idempotency key) — deliberately deferred. *Mitigation available
  now if wanted:* before retry, call `checkDeliveredTripDuplicate`; if a Tier-1
  (photo) / Tier-2 exact match for this driver+cont+route+date exists very
  recently, treat as already-sent. (Listed as optional follow-up, not in scope.)
- **R2 (low):** Removing health polling loses captive-portal / "backend slow"
  awareness. Acceptable — the new submit-error UX surfaces real failures
  immediately, which is what matters for this app.

## 6. Deliberately deferred (follow-ups, not in this plan)

- Option B: offline queue (IndexedDB + Background Sync) for true out-of-coverage
  auto-retry.
- Option C: backend `client_request_id` idempotency to make retry dup-proof (closes R1).

## 7. Files touched

| File | Change |
|------|--------|
| `frontend/src/pages/driver/useCreateDeliveredTrip.ts` | Gate success on backend confirm; add `submitError` + `succeededContNumbersRef` + `retrySubmit`/`dismissSubmitError`; fix create + edit branches. |
| `frontend/src/components/shared/overlays/SubmitErrorDialog/SubmitErrorDialog.tsx` *(new)* | Failure dialog (reuse Dialog/Button). |
| `frontend/src/pages/driver/CreateDeliveredTrip.tsx` | Render `SubmitErrorDialog`; destructure new hook outputs. |
| `frontend/src/lib/network.ts` | **Delete.** |
| `frontend/src/contexts/AuthContext.tsx` | Remove network import + start/stop calls. |
| `frontend/src/components/shared/navigation/AppTopBar/AppTopBar.tsx` | Remove stale `[offline]` comment token. |
| `frontend/src/components/ui/Toast/Toast.tsx` | Update stale "offline pill" comment. |

## 8. ADR

- **Decision:** Gate driver submit success strictly on the backend's
  `{success:true}`; show an honest, retryable failure otherwise; remove the
  unused offline-listener machinery.
- **Drivers:** data-loss vector; driver trust; minimal-change preference.
- **Alternatives considered:** offline queue (B), backend idempotency key (C).
- **Why chosen:** smallest change that fully fixes the reported false-success
  bug, no backend/schema risk, reuses existing UI.
- **Consequences:** closes the vector; partial-success handled; one residual
  (R1) accepted and documented.
- **Follow-ups:** B and C if stronger offline/retry guarantees are later required.
