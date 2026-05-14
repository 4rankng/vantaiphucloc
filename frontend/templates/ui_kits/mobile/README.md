# TTransport UI kit — Mobile (driver PWA)

Interactive recreation of the **driver** experience for TTransport. The driver app is the only mobile-first surface — it's an installable PWA optimised for one-handed use, offline-tolerant, with AI-assisted container OCR.

## Files

```
ui_kits/mobile/
├── index.html                  # Entry point — React 18 + Babel + screens
├── styles.css                  # Mobile-tuned components, imports colors_and_type.css
├── icons.jsx                   # Same Lucide-style set as web kit
├── HomeScreen.jsx              # Period earnings card + work-order list + FAB + bottom nav
├── TripDetailScreen.jsx        # Read-only view of a single work order
├── NewWorkOrderScreen.jsx      # Camera-capture → OCR result → form
├── App.jsx                     # Root — phone bezel + screen state machine
└── android-frame.jsx           # (Imported starter — not currently used; kept for reference)
```

## Click-through flow

1. Land on **Trang chủ** — earnings for the period, last 6 chuyến.
2. Tap a work-order card → **Chi tiết chuyến**. Tap the back arrow to return.
3. Tap the green **+** FAB → **Chụp số container** (mocked camera). Hit the capture button to see the OCR result populate the form. Submit or cancel returns home.
4. The bottom nav rotates between Trang chủ, Lịch sử, Hồ sơ — currently only Trang chủ has a screen.

## What's faithful, what's stubbed

- **Visual fidelity:** modelled on `frontend/src/pages/driver/DriverHome.tsx`, `CreateWorkOrder.tsx`, the `WorkOrderCard`, and the `MonthNavigator`. The earnings-card watermark, period navigator, FAB, and bottom-nav glass treatment all match production.
- **Stubbed:** camera is a static black panel with a fake "AI đang nhận diện" badge — the production app uses `react-camera-pro` + an OCR endpoint. GPS/timestamp shown in the green callout are also mocked.
