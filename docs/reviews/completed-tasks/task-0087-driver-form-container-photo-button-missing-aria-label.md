# Task-0087: Driver Work Order Form — Container Photo Upload Button Has No Accessible Label

**Type:** Visual Bug / Usability Issue
**Severity:** 🟢 Minor
**Role/Flow:** taixe - Create work order (/driver/work-orders/new)
**Location:** https://phucloc.tingting.vip/driver/work-orders/new
**Viewport:** 375px / all

## Observation
The container photo upload button in the driver work order creation form is rendered as a dashed-border button with no visible text label and no `aria-label` attribute:

```html
<button class="rounded-xl border-2 border-dashed flex items-center justify-center ...">
  <!-- SVG icon only, no text -->
</button>
```

The button appears as a dashed rectangle (presumably a camera icon or upload icon), but:
1. Has no `aria-label` or `aria-describedby`
2. Has no visible text label
3. Is not described in the surrounding UI

The form summary "Còn thiếu: số cont, ảnh cont" mentions "ảnh cont" (container photo) is required, but new users cannot easily identify which element is the photo upload button.

## Impact
1. **Accessibility**: Screen reader users and users with motor impairments navigating via keyboard or switch access cannot identify this button's purpose without an accessible label.
2. **UX discoverability**: First-time driver users may not understand that clicking the dashed rectangle will open the camera or file picker, especially if the icon alone is ambiguous on small screens.

## Recommendation
Add an `aria-label="Chụp ảnh container"` to the button. Optionally, add a short visible label below the icon (e.g., "Chụp ảnh") to improve discoverability for new users. The existing dashed-border style is a good affordance — pair it with text for clarity.

## Resolution
Already fixed in current code. CreateWorkOrder.tsx (line 86) has `aria-label="Chụp ảnh container"` on the container photo upload button.
