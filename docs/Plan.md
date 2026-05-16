### 1. Customer-sent vessel manifests (what shipping lines send Phúc Lộc)

 File                  │ Ship           │ Format                │ Key Columns            │ Routes
───────────────────────┼────────────────┼───────────────────────┼────────────────────────┼────────────────────────
  2.GLORY SHANGHAI-    │ GLORY SHANGHAI │ 2 sheets - summary    │ hãng tàu, Container,   │ HP→HKG, HP→TAG, HP→SHA
 2612N.xlsx            │                │ layout split into     │ Kích thước, Loại hộp,  │
                       │                │ HKG/TAG/SHA columns + │ Thời gian nhập cảnh    │
                       │                │ detailed Sheet1 (67   │                        │
                       │                │ cols)                 │                        │
  8.CONSCIENCE         │ CONSCIENCE     │ 2 sheets - summary    │ Same as above          │ HP→NSA, HP→SHA,
 2615N.xlsx            │                │ split into            │                        │ HP→TAG, HP→HKG
                       │                │ NSA/SHA/TAG/HKG +     │                        │
                       │                │ detailed Sheet (100   │                        │
                       │                │ cols)                 │                        │
  Loading list of      │ HAIAN BETA     │ 1 sheet with header   │ SQ, POD, OPR,          │ HP→VNNGH, HP→VNDAD,
 HAIAN BETA 062S.xls   │                │ metadata (vessel,     │ ContainerNo., TIME     │ HP→VNVUT, HP→VNSGN
                       │                │ voyage, ETA, ETD) +   │ OUT, F/E, SIZE, WG, CY │
                       │                │ 893 container rows    │                        │

Key observation: Customer manifests come in different formats. SJJ ships have a multi-column summary layout. HAIAN
has a clean tabular format with port-of-discharge (POD) per row. The columns Huyền highlighted (E, I, J) =
Container, Kích thước, Loại Container.

### 2. Phúc Lộc's internal dispatch/billing file

 File                                 │ Content
──────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────
  Phúc Lộc - Shipside T4.26 HAP.xlsx  │ 4 sheets: Bảng kê SS (434 rows — the actual trip log with TT, SỐCONT,
                                      │ LOẠI, H/R, TÀU, CHUYỾN, NƠI LẤY, NƠI TRẢ, SỐ XE VC, ĐƠN GIÁ, THUẾ GTGT
                                      │ 8%, THÀNH TIỀN, Ngày, Ký hiệu cước, Giá dầu TB), Sheet2 (pivot summary by
                                      │ truck), Sheet1 (flat list for invoice), CUOC (Phúc Lộc's own rate card)

This is the invoice template they send to customer HAIAN — it includes company headers (AMT PHÚC LỘC as seller,
CÔNG TY TNHH CẢNG HẢI AN as buyer), tax IDs, VAT calculations.

### 3. Reference/lookup data

 File                      │ Content
───────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────
  DS PORT.xlsx             │ 30+ port/depot names (BÃI HẢI PHÒNG, HATECO, HICT, NHĐV, HẢI AN, GLC, etc.) — the
                           │ location lookup table
  DS PORT+CƯỚC TUYẾN.xlsx  │ Same port list + CƯỚC TUYẾN sheet: 157 rows of rates by CHỦ HÀNG (cargo owner), ĐIỂM
                           │ ĐI, ĐIỂM ĐẾN, F20/F40/E20/E40 prices, TÁC NGHIỆP (XUẤT/NHẬP TÀU vs CHUYỂN BÃI)

### 4. Processed/extracted data

 File                        │ Content
─────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────
  containers_extracted.csv   │ 1,715 normalized rows from all manifests: container_number, cont_type, pickup,
                             │ dropoff, vessel, source
  trips_shipside_t4_26.json  │ 414 actual truck trips from April 2026: container, size (20/40), H/R, vessel,
                             │ voyage, pickup, dropoff, plate (18 unique trucks), unit_price (386,100 for 20ft /
                             │ 448,500 for 40ft), trip_date

--------

## What Customer One (Phúc Lộc) Needs — from the conversation

Phúc Lộc = CÔNG TY TNHH AMT PHÚC LỘC — a container trucking company in Hai Phong.

### Core business flow:

1. Shipping lines (customers) send vessel manifests (Excel) listing containers to transport
2. Phúc Lộc dispatches trucks to move containers between ports/depots
3. Drivers record trips (container #, route, vessel)
4. Accountant reconciles driver trips against customer manifests
5. Monthly invoice exported to Excel using their template format

### Specific requirements from the conversation:

1. Excel upload & parsing — customer files come in varying formats; extract container #, size, type, vessel name
2. Two reconciliation workflows:
  • Customer sends manifest → accountant matches trips against it
  • No manifest → driver records trips → accountant sends to customer at month-end
3. Driver app — autocomplete pickup/dropoff from lookup table, not free text
4. Pricing engine — varies by customer, route, container type, operation type (xuất/nhập tàu vs chuyển bãi), and
cargo owner
5. External truck management — hired trucks also submit Excel for reconciliation
6. Monthly cost entry per truck (fuel, repairs, other, general) — entered monthly not per trip
7. Driver salary — base + productivity; one truck can have 2 drivers
8. P&L per truck = Revenue - Costs
9. Export to Excel following their invoice template (Bảng kê SS format with company headers, VAT, etc.)
10. Location management — accountant can add new ports/depots dynamically





Chủ hàng (Clients)
- Hiển thị danh sách chủ hàng dạng table
- Thêm mới / cập nhập chủ hàng

Nhà thầu (Vendors)
- Hiển thị danh sách nhà thầu dạng table
- Thêm mới / cập nhập nhà thầu

Lái xe (Drivers)
- Hiển thị danh sách lái xe dạng table
- Quản lý lương cơ bản
- Thêm mới / cập nhập lái xe
- Khi tạo tài khoản lái xe mới, có thể gán xe cho lái xe. Một xe có thể nghiều lái xe
- Khi cập nhập tài khoản lái xe, có thể đổi xe sang xe khác (effective date = now (P0), tương lai (P1))

Vận tải (Transporters)
- Quản lý xe vận chuyển. Hiện danh sách xe hiện có, cùng danh sách tài xe sử dụng xe. Có thể loại bỏ, hoặc thêm lái xe.
- Quản lý địa điểm. Hiện danh sach địa điểm (điạ điểm được dùng để chọn làm điểm đến hoặc điểm đi). Có thể thêm aliases cho một địa điểm. Kế toán có thể chọn địa điểm nào là tên chính (còn lại là tên phụ). Phần mềm phải xử lý được trường hợp tên phụ thành tên chính và tên chính thành tên phụ
- Quản lý chi phí xe (kế toán nhập chi phí xe cho cả tháng, khi nhập chi phí thì phải chọn kỳ lương tháng)

Cài đặt
- Cho phép kế toán thiết lâp kỳ lương ví dụ kỳ lương có thể là 26 tháng này đến 25 tháng sau, hoặc đầu tháng đến cuối tháng
- Nếu kế toán thay đổi thiết lập thì hệ thống phải tự cập nhận thông tin tổng quan (ví dụ: tài xế nhìn lương tháng này sẽ bị ảnh hưởng, hoặc doanh thu, chi phí, lãi sẽ bị ảnh hưởng)

*** Khi nói đến tháng trong phần mềm, chúng ta nói đến kỳ lương tháng được thiết lập trong phần mềm chứ không phải tháng theo dương lịch

### Sidebar Navigation

  ┌──────────────────────────┐
  │  🚛 TTransport           │
  ├──────────────────────────┤
  │  Tổng quan           /   │  ✅ done
  ├──────────────────────────┤
  │  QUẢN LÝ                 │
  │  Chủ hàng      /clients  │  NEW
  │  Nhà thầu     /vendors   │  NEW
  │  Lái xe      /drivers    │  NEW
  │  Vận tải  /transporters  │  NEW
  ├──────────────────────────┤
  │  CÀI ĐẶT                 │
  │  Thiết lập    /settings  │  NEW
  ├──────────────────────────┤
  │  👤 Kế toán   [▼] [⏻]   │
  └──────────────────────────┘

│ Key rename: "Đối tác" → "Chủ hàng" (clients only, per your instruction). Vendors stay "Nhà thầu". No more
│ "partners" label anywhere.

Dont use avatars in the page

The design you choose must be extensible and adaptable as we expected lots of changes in the future

The design must incorporate hint to guide users on how to use the application effectively
(i dont want long explanations, excessive details, subtle hints with icons may help, or right place animations)

Core Requirement: The design must incorporate subtle onboarding hints to guide users on how to use the application effectively.

Strict Constraints:

NO heavy text: Do not use long explanations, coach marks with paragraphs of text, or excessive details.

Micro-interactions over text: Lean heavily on subtle icons (e.g., info tooltips, pulse effects) and contextual, right-place animations to guide the user.

Just-in-time discovery: Hints should only appear when relevant to the user's current action, keeping the interface clean and minimalist.
