# Bug-0069: Table Column Headers Use Inconsistent Casing Across Pages

**Type:** Visual Bug  
**Layer:** Frontend  
**Severity:** 🟢 Minor  
**Affected Role/Flow:** Ke toan - Đơn hàng, Khách hàng  
**Viewport:** all  
**Location:** Multiple — `/accountant/trips` (trips table), `/accountant/settings/clients` (clients table)

## Observation
Table column headers mix two distinct casing styles within the same table:

**Trips table (`/accountant/trips`):**
- Title Case: "Ngày", "Khách hàng", "Doanh thu"
- ALL CAPS: "CONTAINER", "TRẠNG THÁI"

**Clients table (`/accountant/settings/clients`):**
- Title Case: "Tên", "SĐT", "MST"
- ALL CAPS: "LOẠI", "ĐỊA CHỈ"

The DOM text content confirms ALL CAPS in `innerText`, ruling out a CSS `text-transform` explanation.

## Impact
Inconsistent visual hierarchy reduces perceived professionalism and makes the interface look unfinished. Mixed casing creates visual noise and may confuse users about which columns are more "important."

## Recommendation
Choose one casing convention for all table headers and apply it consistently. The codebase uses `typo-label` class on `<th>` elements — define a single CSS rule or agree on Title Case for all Vietnamese headers. The simplest fix: change the ALL CAPS literal strings ("CONTAINER", "TRẠNG THÁI", "LOẠI", "ĐỊA CHỈ") to sentence case in the component source.
