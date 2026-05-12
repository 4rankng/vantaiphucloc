# Bug-0068: Import Dialog Close Button Missing aria-label (Accessibility)

**Type:** Visual Bug  
**Layer:** Frontend  
**Severity:** 🟢 Minor  
**Affected Role/Flow:** Ke toan - Nhập đơn hàng (Import)  
**Viewport:** all  
**Location:** https://phucloc.tingting.vip/accountant/trips?import=true — X close button in top-right of import dialog

## Observation
The close (×) button in the "Nhập đơn hàng" import dialog renders as an SVG icon with `aria-hidden="true"` and no `aria-label` on the button element itself. The button has `className="absolute right-4 top-4 rounded-sm opacity-70..."` but carries no accessible name. Screen readers and keyboard users cannot identify the button's purpose.

## Impact
Screen reader users hear an anonymous button with no label when they reach the close button. This fails WCAG 2.1 Success Criterion 4.1.2 (Name, Role, Value) at level AA. Keyboard-only users who tab to the button cannot determine its function.

## Recommendation
Add `aria-label="Đóng"` (or `aria-label="Đóng hộp thoại"`) to the close button element:
```tsx
<button aria-label="Đóng" className="absolute right-4 top-4 ...">
  <X className="h-4 w-4" aria-hidden="true" />
</button>
```
