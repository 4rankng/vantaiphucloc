# Task-0088: Client "LOẠI" Column Misclassifies "Vận Tải Phúc Lộc" as "Cá nhân"

**Type:** Visual Bug / Regression
**Severity:** 🟡 Major
**Role/Flow:** ketoan - Cài đặt → Khách hàng (/accountant/settings/clients)
**Location:** https://phucloc.tingting.vip/accountant/settings/clients
**Viewport:** all

## Observation
The "LOẠI" column in the clients table uses an `isCompany` heuristic to determine whether a client is a company ("Công ty") or individual ("Cá nhân"). The current heuristic appears to check for the presence of "Công ty" in the client name.

The record **"Vận Tải Phúc Lộc"** is classified as **"Cá nhân"** (Individual), which is incorrect — it is a transport company (not an individual person). The other four clients ("Công ty TNHH HAP", "Công ty TNHH HẢI AN", "Công ty TNHH NEWWAY", "Công ty TNHH PAN HẢI AN") are correctly classified as "Công ty".

This is a regression of the fix applied in task-0059 (or an incomplete fix) — the heuristic only works for names starting with "Công ty TNHH" and misses other Vietnamese business name formats such as "Vận Tải" (transport company).

## Impact
The "LOẠI" column will misclassify any company whose name doesn't begin with "Công ty". Other common Vietnamese business name patterns include: "Vận Tải", "Công Ty CP", "Doanh Nghiệp", "HTX". This creates incorrect data display and may affect downstream filtering or reporting if "LOẠI" is used as a data attribute.

## Recommendation
Improve the `isCompany` heuristic to cover more Vietnamese business name patterns. At minimum, add keywords:
- "Vận Tải" (Transport)
- "Công Ty" (case-insensitive)
- "Doanh Nghiệp" (Enterprise)
- "HTX" (Cooperative)
- "TNHH" (LLC abbreviation appearing mid-name)

Better yet, add an explicit "Loại" field to the client data model (Company / Individual) that can be set during creation, rather than inferring it from the name.

## Resolution
Already fixed in current code. isCompany() heuristic in utils.ts now checks for: "công ty", "tnhh", "co.", "corp", "vận tải", "xí nghiệp", "doanh nghiệp", "dịch vụ", "thương mại", "cp.", "jsc", plus explicit type='company'. "Vận Tải Phúc Lộc" now correctly classifies as company.
