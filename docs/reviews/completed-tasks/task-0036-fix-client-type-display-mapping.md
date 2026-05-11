# Task 0036 — Fix Khách hàng LOẠI column inverted display mapping

**Type:** Bug
**Severity:** 🔴 Critical
**Reporter:** UX Audit v6 (2026-05-11) — finding UX-03

## Problem

All "Công ty TNHH" companies display "Cá nhân" in the LOẠI column of the Khách hàng table. Opening the edit dialog for any of these companies shows "Loại: Công ty" — the stored value is correct. The table display is mapping `company` → "Cá nhân" instead of `company` → "Công ty".

**Verified via:** Edit dialog shows `<option value="company" selected>Công ty</option>` while table column shows "Cá nhân".

## Root Cause

The table column's enum display map has the values inverted:

```ts
// WRONG (current):
const CLIENT_TYPE_LABELS = {
  company: 'Cá nhân',
  individual: 'Công ty',
};

// CORRECT (fix):
const CLIENT_TYPE_LABELS = {
  company: 'Công ty',
  individual: 'Cá nhân',
};
```

## Affected Files

- `frontend/src/pages/accountant/settings/ClientsPage.tsx` (most likely — the DataTablePro column definition for "Loại")
- Possibly a shared constants file that maps client type enums

## Acceptance Criteria

1. "Công ty TNHH HAP" shows "Công ty" in the LOẠI column
2. "Công ty TNHH HẢI AN" shows "Công ty" in the LOẠI column
3. Any individual clients show "Cá nhân"
4. The ClientDetail read dialog and edit dialog remain unaffected (they are correct)
5. Verified with `document.body.innerText.match(/Cá nhân/g)` — count should equal the number of actual individual clients, not all clients

## Implementation Notes

- This is a pure frontend constant fix — no backend change needed
- Estimated effort: 5 minutes
- Do NOT change the edit form — it already shows the correct value
- Check if the same enum map is used in NhàThầu (vendors) page — apply same fix there if affected
