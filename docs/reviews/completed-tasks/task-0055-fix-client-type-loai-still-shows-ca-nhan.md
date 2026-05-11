# Task 0055: Khách hàng "Loại" column shows "Cá nhân" for all clients

**Type:** Bug (Regression — listed as fixed in prior round but still present)
**Layer:** Frontend + Backend
**Severity:** Medium
**Affected Role/Flow:** Kế toán — Cài đặt > Khách hàng

## Description

The "Loại" (Type) column on the Khách hàng settings page shows "Cá nhân" for every client record, including companies clearly named "Công ty TNHH HAP", "Công ty TNHH HẢI AN", etc.

Root cause (confirmed by code inspection):

1. The `Partner` TypeScript interface in `frontend/src/data/domain.ts` has no `type` field — it only has `partnerType` (`'client' | 'vendor' | 'both'`) and `partnerRole` (`'shipping_line' | 'factory' | 'transport' | 'other'`).

2. `ClientList.tsx` line 131 uses `c.type === 'company' ? 'Công ty' : 'Cá nhân'` where `c.type` is always `undefined` because the field does not exist on the API response or the TypeScript type.

3. The API (`/api/v1/partners`) confirms: no `client_type` or `type` field is returned — only `partner_type` and `partner_role`.

The previous fix task (0036) was marked completed but the field was never added to the backend schema or the frontend `Partner` type.

## Steps to Reproduce

1. Login as ketoan / admin123
2. Navigate to Cài đặt > Khách hàng
3. Observe the "Loại" column

## Expected

Companies (whose names begin with "Công ty TNHH…") should show "Công ty". Only sole traders / individuals should show "Cá nhân".

## Actual

All 5 clients show "Cá nhân" regardless of actual business type.

## Fix Hint

Two options:

**Option A (preferred — proper fix):** Add a `client_type: 'company' | 'individual'` column to the `partners` table in the backend. Return it in the API. Add `type?: 'company' | 'individual'` to the `Partner` interface in `domain.ts`. Seed existing clients with `client_type = 'company'` where appropriate.

**Option B (quick heuristic):** In `ClientList.tsx`, change the accessor to derive type from the partner name: e.g. `c.name.toLowerCase().includes('công ty') || c.name.toLowerCase().includes('tnhh') ? 'Công ty' : 'Cá nhân'`. This is a workaround — the field should exist in the DB.

Key files:
- `frontend/src/data/domain.ts` — add `type` to `Partner` interface
- `frontend/src/pages/accountant/ClientList.tsx` line 131 — uses `c.type`
- `backend/app/models/base.py` (or partner model) — add `client_type` column
- `backend/app/schemas/domain.py` — add field to partner schema
