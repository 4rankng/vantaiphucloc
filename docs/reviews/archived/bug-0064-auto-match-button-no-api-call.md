# Bug-0064: "Tự động ghép" Button Fires No API Call — Auto-Match Broken

**Type:** Interaction Bug  
**Layer:** Frontend  
**Severity:** 🔴 Critical  
**Affected Role/Flow:** Ke toan - Ghép chuyến (Auto-Match)  
**Viewport:** all  
**Location:** https://phucloc.tingting.vip/accountant/work-orders — "Tự động ghép" button in top toolbar

## Observation
Clicking the "Tự động ghép" (Auto-Match) button produces no result. Confirmed via `fetch` interceptor: zero network requests are made after click. No loading spinner appears on the button, no confirmation dialog, no result toast ("Đã ghép N cặp"), no change to the pending count. The button has an `onClick` handler (verified via React fiber props) but it does not call any API endpoint.

## Impact
The bulk auto-match feature is completely non-functional. Accountants cannot use the one-click auto-match to process large batches of work orders. Combined with bug-0063, there is no working path to create any match in the system.

## Recommendation
Inspect the `onClick` handler of the "Tự động ghép" button. It likely should call `POST /api/v1/operations/auto-match` with the current period parameter. Check whether the handler references a `useMutation` that is not initialized, or whether the button's click event is being swallowed by a parent container. Verify the auto-match API endpoint is live and accepts the request format.
