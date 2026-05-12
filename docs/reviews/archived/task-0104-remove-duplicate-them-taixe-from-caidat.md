# Task 0104 — Remove duplicate "Thêm tài xế" from Cài đặt page

## Scope
Currently, the accountant Cài đặt page has TWO places to add a tài xế:
1. **Cài đặt > Tài xế** (`DriverList.tsx`) — has its own inline "Thêm tài xế" dialog with `useCreateDriver`
2. **Cài đặt > Người dùng** (`UserManagement.tsx`) — has "Tạo tài khoản" which also creates driver-role users via `useCreateUser`

This duplication is confusing. The requirement says: **"Thêm tài xế" should only exist under Người dùng page**, not duplicated under Tài xế.

**What to do:** Remove the "Thêm tài xế" creation functionality from the DriverList page. The DriverList page at `/accountant/settings/drivers` should become **read-only** — it shows the list of drivers with search, but the add/create dialog and button should be removed.

## Technical Implementation

### Frontend
1. **`frontend/src/pages/accountant/DriverList.tsx`**:
   - Remove the `Plus` icon import from lucide-react
   - Remove the `useCreateDriver` hook import and usage
   - Remove the `dialogOpen` state, `form` state, `formErrors` state
   - Remove the `validateForm` and `handleSubmit` functions
   - Remove the "Thêm tài xế" button from `SettingsPageLayout.actions`
   - Remove the entire modal dialog at the bottom (the `<div className="fixed inset-0 z-50...">` block)
   - Keep the search, DataTablePro, and plate column as-is

2. **No backend changes needed** — `POST /drivers` endpoint stays available for other callers.

## Testing Criteria
- [ ] `/accountant/settings/drivers` shows driver list with search, no "Thêm tài xế" button
- [ ] `/accountant/settings/users` still has "Tạo tài khoản" with driver role option
- [ ] No regression in driver list display (name, phone, plate columns)

## Resolution

**Completed 2026-05-12.** Removed all creation UI from `DriverList.tsx`:
- Removed `Plus`, `Phone`, `X` imports, `useCreateDriver`, `useToast`
- Removed `dialogOpen`, `form`, `formErrors` state, `validateForm`, `handleSubmit`
- Removed "Thêm tài xế" button from SettingsPageLayout actions
- Removed the entire modal dialog
- Page is now read-only: search + DataTablePro with name/phone/plate columns

File changed: `frontend/src/pages/accountant/DriverList.tsx`
