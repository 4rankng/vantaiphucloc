# Task 0059: Khách hàng "Loại" column still shows "Cá nhân" for companies (regression)

**Type:** Bug (Regression — previously reported as task-0055, marked completed, still present in production)
**Layer:** Frontend
**Severity:** Medium
**Affected Role/Flow:** Kế toán — Cài đặt > Khách hàng

## Description

The "LOẠI" column on the Khách hàng settings page (`/accountant/settings/clients`) shows "Cá nhân" for all 5 client records, even those clearly named as companies (e.g. "Công ty TNHH HAP", "Công ty TNHH HẢI AN", "Công ty TNHH NEWWAY", "Công ty TNHH PAN HẢI AN").

The frontend source code (`ClientList.tsx`) has the correct `isCompany()` heuristic fix (checking for "công ty"/"tnhh" in the name), but the live production app is still rendering "Cá nhân" for all. This indicates the fix has not been deployed to production, or the deployed bundle is stale.

## Steps to Reproduce

1. Login as ketoan / admin123
2. Navigate to Cài đặt → Khách hàng
3. Observe the "LOẠI" column for all 5 clients

## Expected

- "Công ty TNHH HAP" → **Công ty**
- "Công ty TNHH HẢI AN" → **Công ty**
- "Công ty TNHH NEWWAY" → **Công ty**
- "Công ty TNHH PAN HẢI AN" → **Công ty**
- "Vận Tải Phúc Lộc" → Cá nhân (no company keywords)

## Actual

All 5 clients show **Cá nhân** in the Loại column.

## Fix Hint

The fix exists in `frontend/src/pages/accountant/ClientList.tsx` lines 22–26:
```typescript
function isCompany(client: Partner): boolean {
  const n = client.name?.toLowerCase() ?? ''
  return n.includes('công ty') || n.includes('tnhh') || n.includes('co.') || n.includes('corp') || client.type === 'company'
}
```
The fix logic is correct. The issue is likely that the latest frontend build has not been deployed. Run `pnpm build` in `frontend/` and redeploy.
