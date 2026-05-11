# Bug-0073: SuperAdmin "Tạo tài khoản" Form Submits Silently With Empty Required Fields

**Type:** UX Friction  
**Layer:** Frontend  
**Severity:** 🟡 Major  
**Affected Role/Flow:** Admin - Tạo tài khoản  
**Viewport:** all  
**Location:** https://phucloc.tingting.vip/superadmin — "Tạo tài khoản" dialog

## Observation
The "Tạo tài khoản" dialog marks three fields as required with asterisks (*): "Vai trò", "Tên đăng nhập", and "Mật khẩu". However, all `<input>` elements have `required=false` in the DOM. Clicking "Xác nhận" with all fields empty: no validation error messages appear, no toast is shown, the dialog stays open, and no network request is made. The form silently does nothing.

## Impact
Admin users receive no feedback when they attempt to submit an incomplete form. The asterisk (*) labels imply required fields, but the behavior does not enforce this. Users may think the form is broken or that their submission succeeded when it did not.

## Recommendation
1. Add `required` attributes (or Zod/React Hook Form validation) to the mandatory fields.
2. Display inline error messages below each empty required field on submit attempt (e.g., "Vui lòng nhập tên đăng nhập").
3. Disable or visually gray-out the "Xác nhận" button until the required fields are filled, as a secondary signal.
4. If React Hook Form or Zod is already used, ensure the `handleSubmit` wrapper is correctly validating before calling the mutation.
