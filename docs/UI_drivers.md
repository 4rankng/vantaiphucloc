# TTransport — Driver Mobile UI Design

> Bottom menu navigation, page layouts, component specifications for driver Capacitor app.
> Target: Android + iOS. Capacitor native wrapper.

---

## 1. Bottom Navigation

**Max 4 items.** Fixed at bottom, always visible. Active item highlighted with brand color.

```
┌─────────────────────────────────────────────────┐
│                                                 │
│              [Page Content Area]                 │
│                                                 │
├──────────┬──────────┬──────────┬────────────────┤
│ 🚛       │ 🧾       │ 💰       │ ☰              │
│ Chuyến   │ Chi phí  │ Thu nhập │ Thêm           │
└──────────┴──────────┴──────────┴────────────────┘
```

| # | Icon | Label | Route | Purpose |
|---|------|-------|-------|---------|
| 1 | 🚛 | Chuyến | `/driver/trips` | Active trip, trip list, trip history |
| 2 | 🧾 | Chi phí | `/driver/expenses` | Declare expenses, receipt photos, pending/approved status |
| 3 | 💰 | Thu nhập | `/driver/earnings` | Today's earnings, monthly summary, breakdown |
| 4 | ☰ | Thêm | `/driver/more` | Grid menu: Notifications, Profile, Settings, Help, Logout |

**Rules:**
- Badge on 🚛 if new trip assigned
- Badge on 🧾 if expense rejected
- Badge on ☰ if unread notifications
- Bottom nav hidden during full-screen camera (checkpoint flow)

---

## 2. Page Inventory

### 2.1 Chuyến Section

| # | Page | Route | Purpose | Access |
|---|------|-------|---------|--------|
| P01 | Trip List | `/driver/trips` | All assigned trips: active, upcoming, completed | Bottom nav → Chuyến |
| P02 | Active Trip | `/driver/trips/:id` | In-progress trip with 4 checkpoints + live status | Tap trip from list |
| P03 | Trip Detail | `/driver/trips/:id/detail` | Completed trip detail: route, km, expenses, photos | Tap completed trip |
| P04 | Trip Photos | `/driver/trips/:id/photos` | All photos for a trip (container, delivery, receipts) | From trip detail |
| P05 | Camera | (modal overlay) | Camera view for checkpoint photos + OCR | From active trip checkpoints |

### 2.2 Chi phí Section

| # | Page | Route | Purpose | Access |
|---|------|-------|---------|--------|
| P06 | Expense List | `/driver/expenses` | All expenses: pending, approved, rejected | Bottom nav → Chi phí |
| P07 | Create Expense | `/driver/expenses/new` | Declare new expense with photo + category | FAB on expense list |
| P08 | Expense Detail | `/driver/expenses/:id` | Single expense detail, receipt photo, status reason | Tap expense from list |

### 2.3 Thu nhập Section

| # | Page | Route | Purpose | Access |
|---|------|-------|---------|--------|
| P09 | Earnings Overview | `/driver/earnings` | Today + monthly earnings summary | Bottom nav → Thu nhập |
| P10 | Earnings Breakdown | `/driver/earnings/breakdown` | Per-trip earnings detail for selected period | From earnings overview |

### 2.4 Thêm Section

| # | Page | Route | Purpose | Access |
|---|------|-------|---------|--------|
| P11 | More Menu | `/driver/more` | Grid of menu items | Bottom nav → Thêm |
| P12 | Notifications | `/driver/notifications` | All notifications: alerts, rejections, reminders | More → Thông báo |
| P13 | Profile | `/driver/profile` | Driver info, GPLX, contact, assigned vehicle | More → Hồ sơ |
| P14 | Settings | `/driver/settings` | App settings, language, GPS, notifications | More → Cài đặt |
| P15 | Help | `/driver/help` | FAQ, contact support, app version | More → Trợ giúp |

**Total: 15 pages**

---

## 3. Page Layouts & Components

### P01: Trip List (`/driver/trips`)

```
┌─────────────────────────────────┐
│ ← Chuyến                    🔍  │  Header (fixed)
├─────────────────────────────────┤
│                                 │
│  [Đang chạy] [Chờ nhận] [Lịch sử] │  Tab selector (3 tabs)
│  ═══════════                    │
│                                 │
│  ┌─────────────────────────┐   │
│  │ TR-2026-0101     🟢 Running│  TripCard
│  │ Cát Lái → Bình Dương       │
│  │ Container: TCLU7845230     │
│  │ 47.3 km · 1h 15m           │
│  │ [Xem chi tiết →]           │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ TR-2026-0103     🟡 Waiting│  TripCard
│  │ HP → Mộc Châu              │
│  │ Container: 40ft             │
│  │ Nhận ca trước 15:00        │
│  │ [Nhận ca →]                │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ TR-2026-0098     ✅ Done  │  TripCard (completed)
│  │ Cát Lái → Đồng Nai         │
│  │ 47.3 km · 120,000 ₫       │
│  │ 20/04/2026                  │
│  └─────────────────────────┘   │
│                                 │
├──────┬──────┬──────┬───────────┤
│ 🚛   │ 🧾   │ 💰   │ ☰         │
└──────┴──────┴──────┴───────────┘
```

**Components:**

| Component | Purpose | Behavior |
|-----------|---------|----------|
| **Header** | Page title + optional search | Fixed top, no scroll |
| **TabSelector** | Filter: Đang chạy / Chờ nhận / Lịch sử | Horizontal scroll tabs, active tab underline |
| **TripCard** | Summary of one trip | Tap → navigate to P02 (active) or P03 (completed). Props: trip_code, route, container, status, km, earnings |
| **StatusBadge** | Visual status indicator | 🟢 Running, 🟡 Waiting, ✅ Done, 🔴 Issue |
| **EmptyState** | No trips placeholder | Icon + "Không có chuyến nào" |

---

### P02: Active Trip (`/driver/trips/:id`)

**The most important page.** Driver spends most time here during a trip.

```
┌─────────────────────────────────┐
│ ← TR-2026-0101                  │  Header
├─────────────────────────────────┤
│                                 │
│  Cát Lái → Bình Dương           │  TripRoute
│  Container: TCLU7845230 · 40ft  │  TripMeta
│                                 │
│  ┌─────────────────────────┐   │
│  │  47.3 km · 1h 15m       │   │  TripStats
│  │  Định mức: 42 lít       │   │
│  └─────────────────────────┘   │
│                                 │
│  ═══ CHECKPOINTS ═══            │  SectionHeader
│                                 │
│  ✅ 1. Nhận ca       08:00     │  CheckpointItem (done)
│  ✅ 2. Chụp container 08:35    │  CheckpointItem (done)
│     └─ TCLU7845230 ✓           │  OCR result
│  ● 3. Chụp giao hàng  ← YOU    │  CheckpointItem (current)
│     └─ [Chụp ảnh]              │  Primary CTA button
│  ○ 4. Hạ bãi xong              │  CheckpointItem (pending)
│                                 │
│  ═══ TỰ ĐỘNG ═══               │  SectionHeader
│  ✅ Lấy rỗng        08:05      │  AutoStep (done)
│  ✅ Đến cảng        08:20      │  AutoStep (done)
│  ✅ Rời cảng        08:40      │  AutoStep (done)
│  ✅ Đang chạy       08:45      │  AutoStep (done)
│  ✅ Đến nơi         09:45      │  AutoStep (done)
│                                 │
│  ═══ CHI PHÍ HÔM NAY ═══       │  SectionHeader
│                                 │
│  🧾 Dầu: 850,000 ₫ (15L)       │  ExpenseSummaryItem
│  🧾 Cầu đường: 120,000 ₫       │  ExpenseSummaryItem
│  [+ Khai chi phí]              │  Secondary CTA
│                                 │
├──────┬──────┬──────┬───────────┤
│ 🚛   │ 🧾   │ 💰   │ ☰         │
└──────┴──────┴──────┴───────────┘
```

**Components:**

| Component | Purpose | Props/Details |
|-----------|---------|---------------|
| **TripRoute** | Origin → Destination | route_name (string) |
| **TripMeta** | Container code + type | container_code, container_type |
| **TripStats** | Distance, time, fuel quota | actual_distance_km, elapsed_time, fuel_quota_liters |
| **SectionHeader** | Divide page sections | title (string) |
| **CheckpointItem** | Manual step with action | step_number, label, timestamp, status (done/current/pending), onAction callback |
| **AutoStep** | Geofence auto-transition | label, timestamp, status |
| **ExpenseSummaryItem** | Quick expense view | category, amount, liters |
| **PrimaryCTA** | Main action button | label, onClick, variant="primary" |
| **SecondaryCTA** | Secondary action | label, onClick, variant="outline" |

**Checkpoint flow detail:**

```
Checkpoint 1: NHẬN CA
  Status: pending → tap → confirm dialog → received → empty_pickup
  GPS plugin: START
  Button: [Nhận ca] → primary blue

Checkpoint 2: CHỤP CONTAINER
  Status: pending → tap → camera opens (P05)
  After photo: OCR processes → show result → driver confirms
  If OCR fails: show input field for manual entry
  GPS: auto-detected (geofence)
  Button: [Chụp ảnh] → primary blue

Checkpoint 3: CHỤP GIAO HÀNG
  Status: pending → tap → camera opens (P05)
  Driver takes photo of delivery
  GPS: auto-detected (geofence)
  Button: [Chụp ảnh] → primary blue

Checkpoint 4: HẠ BÃI XONG
  Status: pending → tap → confirm dialog → dropped_off → completed
  GPS plugin: STOP
  Button: [Xác nhận hạ bãi] → primary green
```

---

### P03: Trip Detail (`/driver/trips/:id/detail`)

**For completed trips only.** Read-only review.

```
┌─────────────────────────────────┐
│ ← Chi tiết chuyến               │
├─────────────────────────────────┤
│                                 │
│  TR-2026-0098                   │  TripCode
│  Cát Lái → Đồng Nai             │  RouteName
│  20/04/2026 · Hoàn thành        │  DateBadge
│                                 │
│  ┌───────┬───────┬───────┐     │
│  │ 47.3  │ 1h 45m│ 120K  │     │  StatCard (3-col grid)
│  │ km    │ thời  │ thu   │     │
│  │       │ gian  │ nhập  │     │
│  └───────┴───────┴───────┘     │
│                                 │
│  Timeline ─────────────          │  SectionHeader
│  ● Nhận ca         08:00        │  TimelineItem
│  ● Lấy rỗng        08:05  (auto)│  TimelineItem
│  ● Đến cảng        08:20  (auto)│  TimelineItem
│  ● OCR: TCLU...    08:35        │  TimelineItem (with photo thumb)
│  ● Rời cảng        08:40  (auto)│  TimelineItem
│  ● Đang chạy       08:45  (auto)│  TimelineItem
│  ● Đến nơi         09:45  (auto)│  TimelineItem
│  ● Chụp giao       10:00        │  TimelineItem (with photo thumb)
│  ● Hạ bãi          10:15        │  TimelineItem
│  ● Hoàn thành      10:15  (auto)│  TimelineItem
│                                 │
│  Chi phí ─────────────          │  SectionHeader
│  Dầu:        850,000 ₫  (15L)   │  ExpenseRow
│  Cầu đường:  120,000 ₫         │  ExpenseRow
│  ──────────────────             │
│  Tổng:     970,000 ₫            │  TotalRow
│                                 │
│  [Xem ảnh →]                    │  Link → P04
│                                 │
├──────┬──────┬──────┬───────────┤
│ 🚛   │ 🧾   │ 💰   │ ☰         │
└──────┴──────┴──────┴───────────┘
```

**Components:**

| Component | Purpose | Props |
|-----------|---------|-------|
| **TripCode** | Large trip code display | trip_code |
| **RouteName** | Origin → destination | origin, destination |
| **DateBadge** | Date + status | date, status |
| **StatCard** | Single metric in grid | value, label, unit |
| **TimelineItem** | Step in trip timeline | label, timestamp, is_auto, photo_thumb_url |
| **ExpenseRow** | Single expense line | category, amount, liters |
| **TotalRow** | Sum line | label, amount |

---

### P04: Trip Photos (`/driver/trips/:id/photos`)

```
┌─────────────────────────────────┐
│ ← Ảnh chuyến TR-2026-0098      │
├─────────────────────────────────┤
│                                 │
│  Container lấy hàng ──────      │  SectionHeader
│  ┌───────┐ ┌───────┐           │
│  │ 📷    │ │ 📷    │           │  PhotoGrid (2-col)
│  │ 08:35 │ │ 08:36 │           │  Each: thumbnail + timestamp
│  └───────┘ └───────┘           │  Tap → full screen view
│                                 │
│  Container giao hàng ──────     │  SectionHeader
│  ┌───────┐                     │
│  │ 📷    │                     │  PhotoGrid
│  │ 10:00 │                     │
│  └───────┘                     │
│                                 │
│  Biên lai ──────────────        │  SectionHeader
│  ┌───────┐ ┌───────┐           │
│  │ 🧾    │ │ 🧾    │           │  PhotoGrid
│  │ Dầu   │ │ Cầu   │           │  Each: thumbnail + category + amount
│  │ 850K  │ │ 120K  │           │
│  └───────┘ └───────┘           │
│                                 │
├──────┬──────┬──────┬───────────┤
│ 🚛   │ 🧾   │ 💰   │ ☰         │
└──────┴──────┴──────┴───────────┘
```

**Components:**

| Component | Purpose | Props |
|-----------|---------|-------|
| **PhotoGrid** | Grid of photo thumbnails | columns=2, photos[] |
| **PhotoThumb** | Single photo thumbnail | url, timestamp, category?, amount? |
| **PhotoViewer** | Full-screen photo view (modal) | url, swipe to next/prev |

---

### P05: Camera (Modal Overlay)

**Full-screen camera overlay.** Bottom nav hidden during camera.

```
┌─────────────────────────────────┐
│                                 │
│                                 │
│         [Camera Viewfinder]     │
│                                 │
│      ┌─────────────────┐       │
│      │ Container frame │       │  Guide overlay (dotted rectangle)
│      └─────────────────┘       │
│                                 │
│  📷 Chụp container tại cảng     │  CameraLabel
│                                 │
├─────────────────────────────────┤
│  [✕ Hủy]    [📸 Chụp]    ...   │  CameraControls
│                                 │
│  Sau khi chụp:                  │
│  ┌─────────────────────────┐   │
│  │ [Preview image]          │   │  PhotoPreview
│  │                          │   │
│  │ OCR: TCLU7845230         │   │  OCRResult
│  │                          │   │
│  │ ❌ Không đúng → Chụp lại │   │  RetakeButton
│  │ ✅ Xác nhận → Khóa ảnh   │   │  ConfirmButton
│  └─────────────────────────┘   │
└─────────────────────────────────┘
```

**Components:**

| Component | Purpose | Props |
|-----------|---------|-------|
| **CameraLabel** | What to photograph | label (string) |
| **CameraControls** | Capture/Cancel/Flip | onCapture, onCancel, onFlip |
| **PhotoPreview** | Preview captured photo | image_url |
| **OCRResult** | AI-read text + confidence | text, confidence, editable |
| **ConfirmButton** | Lock photo + save | onClick |
| **RetakeButton** | Delete + retake | onClick |

---

### P06: Expense List (`/driver/expenses`)

```
┌─────────────────────────────────┐
│ Chi phí                         │
├─────────────────────────────────┤
│                                 │
│  [Chờ duyệt] [Đã duyệt] [Từ chối] │  TabSelector (3 tabs)
│  ═══════════                    │
│                                 │
│  ┌─────────────────────────┐   │
│  │ 🧾 Dầu · 850,000 ₫      │   │  ExpenseCard
│  │ TR-0101 · 15 lít         │   │
│  │ 21/04/2026 08:30         │   │
│  │ ⏳ Chờ duyệt              │   │  StatusBadge (pending)
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ 🧾 Cầu đường · 120,000 ₫│   │  ExpenseCard
│  │ TR-0101                   │   │
│  │ 21/04/2026 09:00         │   │
│  │ ❌ Từ chối                │   │  StatusBadge (rejected)
│  │ "Biên lai mờ"            │   │  RejectReason
│  └─────────────────────────┘   │
│                                 │
│                        [+ ]     │  FAB (floating action button)
│                                 │
├──────┬──────┬──────┬───────────┤
│ 🚛   │ 🧾   │ 💰   │ ☰         │
└──────┴──────┴──────┴───────────┘
```

**Components:**

| Component | Purpose | Props |
|-----------|---------|-------|
| **ExpenseCard** | Single expense summary | amount, category, trip_code, liters?, status, reject_reason? |
| **FAB** | Floating "add" button | icon=+, onClick → navigate to P07 |

---

### P07: Create Expense (`/driver/expenses/new`)

```
┌─────────────────────────────────┐
│ ← Khai chi phí                  │
├─────────────────────────────────┤
│                                 │
│  Chuyến ──────────────          │
│  [TR-2026-0101 ▼]              │  SelectTrip (dropdown)
│                                 │
│  Loại chi phí ──────────        │
│  ⬤ Nhiên liệu  ○ Cầu đường    │  CategorySelector (radio pills)
│  ○ Sửa chữa    ○ Khác          │
│                                 │
│  Số tiền ──────────────         │
│  [850,000          ] ₫          │  AmountInput (number + currency)
│                                 │
│  Số lít (nhiên liệu) ──        │
│  [15               ] lít        │  LitersInput (conditional, only for fuel)
│                                 │
│  Mô tả ────────────────         │
│  [Đổ dầu tại trạm PV  ]        │  DescriptionInput (text)
│                                 │
│  Biên lai ─────────────         │
│  ┌─────────────────┐           │
│  │  📷 Chụp biên lai │           │  ReceiptPhoto (camera trigger)
│  │  hoặc chọn ảnh    │           │
│  └─────────────────┘           │
│                                 │
│  [Gửi duyệt]                    │  SubmitButton (full width)
│                                 │
├──────┬──────┬──────┬───────────┤
│ 🚛   │ 🧾   │ 💰   │ ☰         │
└──────┴──────┴──────┴───────────┘
```

**Components:**

| Component | Purpose | Props |
|-----------|---------|-------|
| **SelectTrip** | Dropdown of active trips | trips[], selected |
| **CategorySelector** | Radio pills for expense type | categories[], selected, onChange |
| **AmountInput** | Currency input | value, currency="₫" |
| **LitersInput** | Fuel volume input | value, unit="lít", show only when category=fuel |
| **DescriptionInput** | Free text | value, placeholder |
| **ReceiptPhoto** | Camera trigger + preview | photo_url, onCapture |
| **SubmitButton** | Submit expense | onClick, disabled until valid |

---

### P08: Expense Detail (`/driver/expenses/:id`)

```
┌─────────────────────────────────┐
│ ← Chi tiết chi phí              │
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────┐   │
│  │ [Full receipt photo]      │   │  PhotoViewer (large)
│  └─────────────────────────┘   │
│                                 │
│  Trạng thái ──────────          │
│  ⏳ Chờ duyệt                   │  StatusBadge (large)
│                                 │
│  Chuyến: TR-2026-0101           │  DetailRow
│  Loại: Nhiên liệu               │  DetailRow
│  Số tiền: 850,000 ₫             │  DetailRow
│  Số lít: 15 lít                 │  DetailRow (conditional)
│  Mô tả: Đổ dầu tại trạm PV     │  DetailRow
│  Vị trí: 10.740, 106.730        │  DetailRow (GPS coords)
│  Thời gian: 21/04/2026 08:30   │  DetailRow
│                                 │
│  (Nếu từ chối:)                 │
│  ❌ Lý do: "Biên lai mờ,       │  RejectReason
│     gửi lại ảnh rõ hơn"         │
│                                 │
│  [Gửi lại] (if rejected)        │  ResubmitButton
│                                 │
├──────┬──────┬──────┬───────────┤
│ 🚛   │ 🧾   │ 💰   │ ☰         │
└──────┴──────┴──────┴───────────┘
```

---

### P09: Earnings Overview (`/driver/earnings`)

```
┌─────────────────────────────────┐
│ Thu nhập                        │
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────┐   │
│  │  Hôm nay                 │   │  EarningsHeroCard
│  │  800,000 ₫               │   │  (large number, prominent)
│  │  3 chuyến hoàn thành     │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │  Tháng này               │   │  MonthlyCard
│  │  12,500,000 ₫            │   │
│  │  28 chuyến · 1,200 km   │   │
│  └─────────────────────────┘   │
│                                 │
│  Phân loại ────────────         │  SectionHeader
│                                 │
│  Tiền đi đường: 8,400,000 ₫    │  EarningBreakdownRow
│  Thưởng:         2,100,000 ₫    │  EarningBreakdownRow
│  Phạt:          -500,000 ₫     │  EarningBreakdownRow (red)
│  Khác:           500,000 ₫     │  EarningBreakdownRow
│  ──────────────────             │
│  Tổng:        12,500,000 ₫     │  TotalRow
│                                 │
│  [Xem chi tiết →]               │  Link → P10
│                                 │
├──────┬──────┬──────┬───────────┤
│ 🚛   │ 🧾   │ 💰   │ ☰         │
└──────┴──────┴──────┴───────────┘
```

---

### P10: Earnings Breakdown (`/driver/earnings/breakdown`)

```
┌─────────────────────────────────┐
│ ← Chi tiết thu nhập             │
├─────────────────────────────────┤
│                                 │
│  [Tháng này ▼]                  │  PeriodPicker (month selector)
│                                 │
│  ┌─────────────────────────┐   │
│  │ TR-0101 · 21/04          │   │  EarningCard
│  │ Cát Lái → Bình Dương    │   │
│  │ 100,000 ₫ · 47.3 km     │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ TR-0103 · 21/04          │   │  EarningCard
│  │ HP → Mộc Châu           │   │
│  │ 120,000 ₫ · 180 km      │   │
│  └─────────────────────────┘   │
│                                 │
│  ... (scrollable list)          │
│                                 │
├──────┬──────┬──────┬───────────┤
│ 🚛   │ 🧾   │ 💰   │ ☰         │
└──────┴──────┴──────┴───────────┘
```

---

### P11: More Menu (`/driver/more`)

**Grid layout.** Group overflow items here.

```
┌─────────────────────────────────┐
│ Thêm                            │
├─────────────────────────────────┤
│                                 │
│  ┌──────┐  ┌──────┐  ┌──────┐ │
│  │ 🔔   │  │ 👤   │  │ ⚙️   │ │  MenuItem (3-col grid)
│  │Thông │  │Hồ sơ │  │Cài   │ │
│  │báo   │  │      │  │đặt   │ │
│  │  (3) │  │      │  │      │ │  Badge count
│  └──────┘  └──────┘  └──────┘ │
│                                 │
│  ┌──────┐  ┌──────┐  ┌──────┐ │
│  │ ❓   │  │ 📋   │  │ 🚪   │ │
│  │Trợ   │  │Quy   │  │Đăng  │ │
│  │giúp  │  │định  │  │xuất  │ │
│  └──────┘  └──────┘  └──────┘ │
│                                 │
│  v1.0.0                         │  AppVersion
│                                 │
├──────┬──────┬──────┬───────────┤
│ 🚛   │ 🧾   │ 💰   │ ☰         │
└──────┴──────┴──────┴───────────┘
```

**Components:**

| Component | Purpose | Props |
|-----------|---------|-------|
| **MenuItem** | Grid item with icon + label | icon, label, badge_count?, route |
| **AppVersion** | Version display | version string |

**Menu items:**

| # | Icon | Label | Route | Purpose |
|---|------|-------|-------|---------|
| 1 | 🔔 | Thông báo | P12 | Notifications list |
| 2 | 👤 | Hồ sơ | P13 | Profile, GPLX info |
| 3 | ⚙️ | Cài đặt | P14 | App preferences |
| 4 | ❓ | Trợ giúp | P15 | FAQ, support |
| 5 | 📋 | Quy định | (webview) | Company rules/policies |
| 6 | 🚪 | Đăng xuất | — | Logout + blacklist token |

---

### P12: Notifications (`/driver/notifications`)

```
┌─────────────────────────────────┐
│ ← Thông báo                     │
├─────────────────────────────────┤
│                                 │
│  [Đánh dấu tất cả đã đọc]       │  MarkAllRead button
│                                 │
│  ┌─────────────────────────┐   │
│  │ ❌ Chi phí bị từ chối     │   │  NotificationCard (unread)
│  │ Dầu 850K — "Biên lai mờ"│   │
│  │ 2 phút trước  ●          │   │  UnreadDot
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ 🚛 Chuyến mới            │   │  NotificationCard (unread)
│  │ TR-0103 HP → Mộc Châu   │   │
│  │ 10 phút trước  ●        │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ ⚠️ GPLX sắp hết hạn      │   │  NotificationCard (read)
│  │ Còn 19 ngày              │   │
│  │ Hôm qua                  │   │  (no dot = read)
│  └─────────────────────────┘   │
│                                 │
├──────┬──────┬──────┬───────────┤
│ 🚛   │ 🧾   │ 💰   │ ☰         │
└──────┴──────┴──────┴───────────┘
```

---

### P13: Profile (`/driver/profile`)

```
┌─────────────────────────────────┐
│ ← Hồ sơ                        │
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────┐   │
│  │  👤 Nguyễn Văn Hoàng     │   │  ProfileHeader
│  │  Tài xế · 51F-1234      │   │  (name, role, vehicle)
│  │  0901234567              │   │
│  └─────────────────────────┘   │
│                                 │
│  Giấy phép lái xe ──────        │  SectionHeader
│  Số: B2-123456789               │  DetailRow
│  Hạn: 10/05/2026                │  DetailRow
│  ⚠️ Còn 19 ngày                │  WarningRow
│                                 │
│  Xe đang gán ──────────         │  SectionHeader
│  Biển số: 51F-1234              │  DetailRow
│  Loại: Container 40ft           │  DetailRow
│  Gán từ: 15/01/2026             │  DetailRow
│                                 │
│  Liên hệ khẩn cấp ──────        │  SectionHeader
│  SĐT: 0987654321                │  DetailRow
│                                 │
├──────┬──────┬──────┬───────────┤
│ 🚛   │ 🧾   │ 💰   │ ☰         │
└──────┴──────┴──────┴───────────┘
```

---

### P14: Settings (`/driver/settings`)

```
┌─────────────────────────────────┐
│ ← Cài đặt                       │
├─────────────────────────────────┤
│                                 │
│  Thông báo ─────────────         │
│  Push notifications  [ON/OFF]   │  ToggleRow
│  Cảnh báo vi phạm   [ON/OFF]    │  ToggleRow
│                                 │
│  GPS ──────────────────          │
│  Theo dõi GPS       [ON]        │  ToggleRow (always ON while trip active)
│                                 │
│  Ngôn ngữ ─────────────         │
│  [Tiếng Việt ▼]                 │  SelectRow
│                                 │
│  Bảo mật ──────────────         │
│  Đổi mật khẩu         [→]       │  NavigateRow
│  Sinh trắc học        [→]       │  NavigateRow (fingerprint/face)
│                                 │
│  Về ứng dụng ──────────         │
│  Phiên bản: 1.0.0               │  DetailRow
│                                 │
├──────┬──────┬──────┬───────────┤
│ 🚛   │ 🧾   │ 💰   │ ☰         │
└──────┴──────┴──────┴───────────┘
```

---

## 4. Shared Component Library

These components are reused across multiple pages.

### Navigation Components

| Component | Used In | Purpose |
|-----------|---------|---------|
| **BottomNav** | All pages | 4-item fixed bottom navigation with badges |
| **Header** | All pages | Page title, back button, optional actions |
| **TabSelector** | P01, P06 | Horizontal tab filter |
| **FAB** | P06 | Floating action button for create |

### Data Display Components

| Component | Used In | Purpose |
|-----------|---------|---------|
| **TripCard** | P01 | Trip summary card with status |
| **StatusBadge** | P01, P02, P06, P08 | Colored pill: 🟢🟡✅❌⏳ |
| **StatCard** | P03 | Single metric (km, time, money) |
| **ExpenseCard** | P06 | Expense summary |
| **EarningCard** | P10 | Per-trip earning |
| **NotificationCard** | P12 | Notification with read/unread state |
| **MenuItem** | P11 | Grid menu item |
| **DetailRow** | P08, P13, P14 | Label: value row |
| **SectionHeader** | P02, P03, P09 | Section divider |
| **EmptyState** | P01, P06 | Placeholder when no data |

### Input Components

| Component | Used In | Purpose |
|-----------|---------|---------|
| **SelectTrip** | P07 | Active trips dropdown |
| **CategorySelector** | P07 | Radio pills for expense category |
| **AmountInput** | P07 | Currency number input |
| **LitersInput** | P07 | Fuel volume (conditional) |
| **DescriptionInput** | P07 | Free text |
| **ToggleRow** | P14 | On/off switch with label |
| **SelectRow** | P14 | Dropdown with label |
| **PeriodPicker** | P10 | Month selector |

### Action Components

| Component | Used In | Purpose |
|-----------|---------|---------|
| **PrimaryCTA** | P02 | Main action (blue button) |
| **SecondaryCTA** | P02 | Secondary action (outline button) |
| **SubmitButton** | P07 | Full-width submit |
| **ConfirmButton** | P05 | Confirm photo + lock |
| **RetakeButton** | P05 | Delete photo + retake |
| **ResubmitButton** | P08 | Re-submit rejected expense |
| **MarkAllRead** | P12 | Mark all notifications read |

### Media Components

| Component | Used In | Purpose |
|-----------|---------|---------|
| **CameraView** | P05, P07 | Capacitor camera integration |
| **PhotoPreview** | P05 | Preview captured photo |
| **PhotoThumb** | P04 | Grid thumbnail |
| **PhotoViewer** | P04, P08 | Full-screen photo with swipe |
| **ReceiptPhoto** | P07 | Camera trigger + preview |

### Status & Feedback Components

| Component | Used In | Purpose |
|-----------|---------|---------|
| **OCRResult** | P05 | AI text result + editable field |
| **RejectReason** | P06, P08 | Red box with rejection reason |
| **UnreadDot** | P12 | Blue dot for unread |
| **WarningRow** | P13 | Yellow warning text |
| **EarningsHeroCard** | P09 | Large today's earnings |
| **MonthlyCard** | P09 | Monthly summary card |

### Trip-Specific Components

| Component | Used In | Purpose |
|-----------|---------|---------|
| **CheckpointItem** | P02 | Manual checkpoint with action button |
| **AutoStep** | P02 | Auto geofence step |
| **TimelineItem** | P03 | Read-only timeline step |
| **TripRoute** | P02 | Origin → Destination display |
| **TripMeta** | P02 | Container code + type |
| **TripStats** | P02 | Distance, time, fuel quota |

---

## 5. Component Hierarchy

```
App
├── BottomNav (shared)
│   ├── Tab: Chuyến
│   │   ├── P01: TripList
│   │   │   ├── Header
│   │   │   ├── TabSelector
│   │   │   ├── TripCard[] (scrollable)
│   │   │   └── EmptyState
│   │   │
│   │   ├── P02: ActiveTrip
│   │   │   ├── Header
│   │   │   ├── TripRoute + TripMeta
│   │   │   ├── TripStats
│   │   │   ├── SectionHeader + CheckpointItem[4]
│   │   │   ├── SectionHeader + AutoStep[6]
│   │   │   ├── SectionHeader + ExpenseSummaryItem[]
│   │   │   └── SecondaryCTA (add expense)
│   │   │
│   │   ├── P03: TripDetail
│   │   │   ├── TripCode + RouteName + DateBadge
│   │   │   ├── StatCard[3] (grid)
│   │   │   ├── TimelineItem[] (scrollable)
│   │   │   ├── ExpenseRow[] + TotalRow
│   │   │   └── Link → P04
│   │   │
│   │   ├── P04: TripPhotos
│   │   │   ├── SectionHeader + PhotoGrid[] (per type)
│   │   │   └── PhotoViewer (modal)
│   │   │
│   │   └── P05: Camera (modal)
│   │       ├── CameraLabel
│   │       ├── CameraControls
│   │       ├── PhotoPreview
│   │       ├── OCRResult
│   │       ├── ConfirmButton
│   │       └── RetakeButton
│   │
│   ├── Tab: Chi phí
│   │   ├── P06: ExpenseList
│   │   │   ├── Header
│   │   │   ├── TabSelector
│   │   │   ├── ExpenseCard[] (scrollable)
│   │   │   ├── EmptyState
│   │   │   └── FAB (+)
│   │   │
│   │   ├── P07: CreateExpense
│   │   │   ├── SelectTrip
│   │   │   ├── CategorySelector
│   │   │   ├── AmountInput
│   │   │   ├── LitersInput (conditional)
│   │   │   ├── DescriptionInput
│   │   │   ├── ReceiptPhoto
│   │   │   └── SubmitButton
│   │   │
│   │   └── P08: ExpenseDetail
│   │       ├── PhotoViewer (receipt)
│   │       ├── StatusBadge
│   │       ├── DetailRow[]
│   │       ├── RejectReason (conditional)
│   │       └── ResubmitButton (conditional)
│   │
│   ├── Tab: Thu nhập
│   │   ├── P09: EarningsOverview
│   │   │   ├── EarningsHeroCard
│   │   │   ├── MonthlyCard
│   │   │   ├── EarningBreakdownRow[] + TotalRow
│   │   │   └── Link → P10
│   │   │
│   │   └── P10: EarningsBreakdown
│   │       ├── PeriodPicker
│   │       └── EarningCard[] (scrollable)
│   │
│   └── Tab: Thêm
│       ├── P11: MoreMenu
│       │   ├── MenuItem[6] (3-col grid)
│       │   └── AppVersion
│       │
│       ├── P12: Notifications
│       │   ├── MarkAllRead
│       │   └── NotificationCard[] (scrollable)
│       │
│       ├── P13: Profile
│       │   ├── ProfileHeader
│       │   ├── SectionHeader + DetailRow[]
│       │   └── WarningRow (conditional)
│       │
│       ├── P14: Settings
│       │   ├── ToggleRow[]
│       │   ├── SelectRow[]
│       │   └── NavigateRow[]
│       │
│       └── P15: Help
│           └── FAQ list + version
```

---

## 6. Navigation Flow

```
App Launch
    │
    ├── Token valid? ──→ P01 Trip List (default)
    │
    └── No token ──→ Login Page

P01 Trip List
    ├── Tap active trip ──→ P02 Active Trip
    │       ├── Checkpoint "Chụp" ──→ P05 Camera (modal)
    │       │       ├── Confirm ──→ back to P02 (checkpoint done)
    │       │       └── Cancel ──→ back to P02
    │       ├── [+ Khai chi phí] ──→ P07 Create Expense
    │       └── All checkpoints done ──→ P03 Trip Detail (read-only)
    │
    ├── Tap completed trip ──→ P03 Trip Detail
    │       └── [Xem ảnh] ──→ P04 Trip Photos
    │
    └── Tap waiting trip ──→ P02 Active Trip (starts with "Nhận ca")

P06 Expense List
    ├── Tap expense ──→ P08 Expense Detail
    └── FAB (+) ──→ P07 Create Expense

P09 Earnings
    └── [Xem chi tiết] ──→ P10 Earnings Breakdown

P11 More Menu
    ├── Thông báo ──→ P12 Notifications
    ├── Hồ sơ ──→ P13 Profile
    ├── Cài đặt ──→ P14 Settings
    ├── Trợ giúp ──→ P15 Help
    ├── Quy định ──→ WebView (company rules)
    └── Đăng xuất ──→ Login Page
```

---

## 7. Design Tokens

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#1e40af` (navy blue) | Primary CTA, active tab, active nav |
| `--color-success` | `#059669` (emerald) | Completed status, confirm button |
| `--color-warning` | `#d97706` (amber) | Pending status, warning row |
| `--color-danger` | `#dc2626` (red) | Rejected, errors, delete |
| `--color-info` | `#0d9488` (teal) | Informational, auto steps |
| `--color-bg` | `#f8fafc` | Page background |
| `--color-surface` | `#ffffff` | Card/surface background |
| `--color-text` | `#0f172a` | Primary text |
| `--color-text-muted` | `#64748b` | Secondary text |
| `--color-border` | `#e2e8f0` | Card borders, dividers |

### Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | 4px | Tight spacing, inline gaps |
| `--space-sm` | 8px | Card internal padding |
| `--space-md` | 16px | Page padding, card gaps |
| `--space-lg` | 24px | Section spacing |
| `--space-xl` | 32px | Page-level spacing |

### Typography

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `--text-hero` | 28px | Bold | Earnings hero number |
| `--text-h1` | 22px | Bold | Page title |
| `--text-h2` | 18px | SemiBold | Section headers |
| `--text-body` | 15px | Regular | Body text, detail rows |
| `--text-caption` | 13px | Regular | Timestamps, muted text |
| `--text-badge` | 11px | SemiBold | Status badges |

### Bottom Nav Dimensions

| Property | Value |
|----------|-------|
| Height | 64px (safe area inset added on iPhone) |
| Icon size | 24px |
| Label size | 11px |
| Active color | `--color-primary` |
| Inactive color | `--color-text-muted` |
| Badge position | Top-right of icon, 8px circle |
| Safe area | `padding-bottom: env(safe-area-inset-bottom)` |

---

## 8. Responsive & Safe Area

### iPhone Safe Area
```
Bottom nav: padding-bottom: env(safe-area-inset-bottom)
Header: padding-top: env(safe-area-inset-top)
Content: scroll between header and bottom nav
```

### Android Foreground Service Notification
```
When GPS tracking active:
  Notification bar: "🚛 Hoàng đang chạy TR-0101"
  Non-dismissible while trip active
  Tap notification → opens app to P02 Active Trip
```

### Offline State
```
Top banner (below header):
  🔴 Mất kết nối — 3 thao tác đang chờ đồng bộ
  Shown when navigator.onLine === false
  Hidden when back online
```

---

*15 pages · 40+ components · 4 bottom nav items · Full checkpoint flow specified*
