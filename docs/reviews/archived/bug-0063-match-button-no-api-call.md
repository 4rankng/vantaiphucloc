# Bug-0063: "Ghép" Button Fires No API Call — Match Action Completely Broken

**Type:** Interaction Bug  
**Layer:** Frontend  
**Severity:** 🔴 Critical  
**Affected Role/Flow:** Ke toan - Ghép chuyến (Work Order Matching)  
**Viewport:** all  
**Location:** https://phucloc.tingting.vip/accountant/work-orders — Match candidate "Ghép" button in right panel

## Observation
Clicking the "Ghép" (Match) button on any match candidate in the right panel of the Ghép chuyến page produces no visible result and fires zero network requests. Confirmed by injecting a `fetch` interceptor: after clicking "Ghép" on both 3/6-score and 2/6-score candidates, `window._fetchLog` remains empty. The WO list count stays at "19 chờ ghép". No confirmation dialog appears, no toast, no state change. The button has a React `onClick` handler wired up but the handler makes no API call and triggers no UI feedback.

## Impact
The core accountant workflow — matching work orders to trip orders — is entirely non-functional. No match can be created from the UI. This blocks all freight operations downstream (driver salary calculation, invoicing, settlement).

## Recommendation
Debug the `onClick` handler on the Ghép button in the match candidate card component. Likely causes: (1) the `useMutation` hook for the match endpoint is not being called, (2) the `workOrderId` or `tripId` passed to the handler is undefined/null, or (3) the button is wrapped in a form that intercepts the click. Add a `console.log` inside the handler to confirm it executes, then trace why the API call is absent. The matching API endpoint is likely `POST /api/v1/operations/work-orders/{id}/match` or similar — verify endpoint availability first.
