# Sample-file analysis — what's customer original vs accountant scratch

> Superseded for the algorithm spec by [`IMPORT_GENERIC_DESIGN.md`](IMPORT_GENERIC_DESIGN.md). This doc remains as the **catalogue** of layouts we've seen so far and the classification of each column as original-customer-data vs accountant-added.
>
> The 4 sample files in `docs/` were all touched by our accountant after delivery (column annotations, helper formulas, sometimes extra sheets, occasionally fuel-price headers). The pre-accountant file from the customer is **strictly a subset** of what we see here — fewer columns, fewer sheets. The generic pipeline is built for the cleaner case; the dirty case still parses because unknown columns are ignored and accountant-scratch keywords are in the SKIP dictionary.

## Per-file classification

### 1) `LOADING LIST HAIAN DELL 037S 19.4.xlsx` (Hai An — loading list)

Sheet **TOTAL** (the only one we use). Column-level classification:

| Col | Header | Origin | Notes |
|---|---|---|---|
| A | `SQ` | customer | row counter |
| B | `POD` | customer | port of discharge — **vessel info, skipped** |
| C | `POL` | customer | port of loading — **vessel info, skipped** |
| D | `OPR` | customer | operator code (HACT) — **vessel info, skipped** |
| E | `LINE` | customer | shipping line (ONE) — **vessel info, skipped** |
| F | `CONTNo.` | customer | container_no |
| G | `SEAL` | customer | seal_no |
| H | `CELL` | customer | stowage cell coordinate — **vessel info, skipped** |
| I | `F` | customer | freight_kind |
| J | `SIZE` | customer | container_size |
| K | `VGM (KGM)` | customer | gross_weight_kg |
| L | `DESCRIPTION OF GOODS` | customer | commodity (multi-word substring rule keeps it from a noisy match) |
| M | `CY` | customer | yard code → pickup_location |
| N | `REMARKS` | customer | remarks |
| O | (blank) | — | |
| P | `Booking No` | customer | customer_ref |
| Q | `Shipper` | customer | consignee |
| R | `SALES/MKT` | **accountant** | regional sales/MKT region — added internally for invoicing routing |
| S | (formula key) | **accountant** | helper concatenation column referencing other cells (`=$R$10&S12&...`) |
| T | `F40HC` literals | **accountant** | denormalised work-type tag for pivot tables |

Other sheets (`SINGAPORE`, `CAT LAI`, `VICT LADEN`, `VICT EMPTY`, `BRAVO`, `00000000`) are **customer template stubs** — empty data rows with `#REF!` / `#NAME?` formulas. The pipeline scores them low and ignores them.

**Production-file shape:** TOTAL sheet with columns A–Q. The pipeline produces identical canonical output whether or not R/S/T are present (verified by `test_loading_list_stripped_extra_cols_same_output`).

### 2) `DISCHARGING LIST HAIAN TIME 454W 6.4.xlsx` (Hai An — discharging list)

Sheet **Sample Sheet** is the only sheet — and looks **fully customer-original**, no accountant additions visible.

| Col | Header | Origin | Notes |
|---|---|---|---|
| A | `Disch Port` | customer | **vessel info, skipped** |
| B | `Bay` | customer | stowage — **skipped** |
| C | `Slot` | customer | stowage — **skipped** |
| D | `Container Id` | customer | container_no |
| E | `Line Operator` | customer | **vessel info, skipped** |
| F | `Size` | customer | container_size |
| G | `Weight` | customer | gross_weight_kg |
| H | `Weight Vermas` | customer | secondary weight; we keep `Weight` (col F) since it has higher confidence |
| I | `Freight Kind` | customer | freight_kind |
| J | `Class` | customer | reefer class — **skipped** (not a TripOrder field) |
| K | `ISO` | customer | container_type_iso |
| L | `Load Port` | customer | **vessel info, skipped** |
| M | `Del Port` | customer | port-coded destination — best dropoff_location we have |
| N | `Temperature` | customer | reefer setpoint — **skipped** |
| O | `Remark` | customer | remarks (often `HCT`) |

**Production-file shape:** identical. No stripping needed.

### 3) `BDST 11.4.xls` (Báo cáo dỡ-trả tàu — `.xls` legacy)

Sheet **Sheet1**, 34 columns wide but only A–AC (29) carry data.

| Col | Header | Origin | Notes |
|---|---|---|---|
| A | (blank) | — | empty leader column |
| B | `Số Container` | customer | container_no |
| C | `Hãng khai thác` | customer | operator (VOS, SOC) — **skipped** (vessel-side identifier) |
| D | `Kích cỡ ISO` | customer | container_type_iso |
| E | `F/E` | customer | freight_kind |
| F | `Nhập/xuất` | customer | Import/Export — operational direction, **skipped** |
| G | `Loại công việc` | customer | "Dỡ tàu"/"Xếp tàu" — operational, **skipped** |
| H | `Phương thức ra` | customer | exit method, **skipped** |
| I | `Loại hàng` | customer | commodity |
| J | `Hàng nội/ngoại` | customer | domestic/foreign — **skipped** |
| K–M | (operator/ISO/F-E repeats) | customer | duplicate of C/D/E — leftover from the port TOS export. Pipeline picks the higher-confidence column. |
| N | (empty) | — | |
| O | start time | customer | trip_date (via value-pattern detection) |
| P | end time | customer | secondary date |
| Q | crane code | customer | **skipped** (`QC01`, `QC02`, `QC-TV`) |
| R–S | (empty) | — | |
| T | description | customer | — |
| U | reference number | customer | customer_ref |
| V–W | (empty) | — | |
| X | location code | customer | numeric position code (`070302`) — informational |
| Y | letter | customer | single-letter status (`C`) |
| Z | from terminal | customer | pickup_location candidate |
| AA | to terminal | customer | dropoff_location candidate |
| AB | terminal | customer | secondary destination |
| AC | TÁC NGHIỆP | customer | "Nhập tàu"/"Hạ bãi" — operational, **skipped** |
| AD–AH | (sometimes "Xuất tàu") | customer | sparse |

**Production-file shape:** likely just B–AC. Cols AD+ are blank in this sample. Algorithm output unchanged.

### 4) `2.GLORY SHANGHAI- 2612N.xlsx` (Glory Shanghai — yard movement log)

Has TWO sheets:

- **`CONSCIENCE 2612N`** — **accountant-added** stowage diagram. Three sub-tables side-by-side (bays B30-B38 / A-34 / A21-A31), one row per cell coordinate, with running totals on the right and a `GIÁ DẦU 35,440` (fuel price) at the top. The pipeline now correctly rejects this sheet via the duplicate-header + ghost-container penalties.
- **`Sheet1`** — original yard movement log. 67 columns, mixed Vietnamese / Chinese / Thai / English headers. **This is what we parse.**

Sheet1 columns we actually map (see live test output):

- `Số xe` → tractor_plate
- `หมายเลขตู้` → container_no (Thai!)
- `Kích thước` → container_size
- `Loại hộp` → container_type_iso
- `Số niêm phong chì` → seal_no
- `Số vận đơn` → customer_ref
- `Số sân` → pickup_location
- `Hộp đi đâu` → dropoff_location
- `Người bán hạt nhân`, `Tài xế` → driver_name
- `Rỗng / Hàng` → freight_kind (via value pattern, not synonym)
- `Tổng trọng lượng`, `Trọng lượng` → gross_weight_kg
- Time columns (`Thời gian xuất hiện`, `Thời gian tiếp cận xe`) → trip_date

Skipped (vessel/admin): `Tên tàu`, `Tên tàu Trung Quốc`, `Chuyến bay`, `Tên đầy đủ của Trung Quốc`, `Hộp xuất hiện`, `Tình trạng hộp xuất hiện`, `Nhiệt độ`, `Độ ẩm`, `Thông gió`.

**Production-file shape:** the `CONSCIENCE 2612N` sheet is almost certainly accountant-added (annotated with kế-toán fuel price + total formulas). The pre-accountant file is just `Sheet1`. Even when both sheets are present, the pipeline picks `Sheet1`.

## What this means for the algorithm

- **No per-customer parser code.** All 4 files run through the same Layer 1–5 pipeline. Verified by `test_import_pipeline.py` (70 passing tests).
- **Accountant additions don't break the algorithm.** The pipeline classifies them as either skip (vessel/admin clutter) or unmapped (unknown helper columns). Either way they don't pollute the canonical output.
- **Production files (cleaner) parse just as well.** The stripped-version test (`test_loading_list_stripped_extra_cols_same_output`) confirms removing accountant cols R/S/T from the loading list yields identical accepted-row counts. The same invariance is expected for the other formats since unknown columns are silently ignored.

## Open question (the only one I couldn't decide without you)

- BDST col K–M (`SOC` / `22G0` / `F`) duplicate the data in C/D/E. Are these original (port TOS often emits the duplication for joins) or accountant copy-pastes for cross-checking? Doesn't matter to the algorithm (we pick the higher-confidence column), but it affects what the production file looks like. **Default assumption: original.**
