# Transporters Page UI Polish — Design Spec

**Date**: 2026-05-17
**Status**: Approved
**Scope**: Visual polish of `/accountant/transporters` page

## Visual Direction

**Light & Bold**: White background, strong 2px borders, heavy typography (800-900 weight), color-coded columns. Professional logistics feel.

## Structure

Keep two tabs: "Xe & Chi phí" and "Địa điểm". No structural changes, only visual polish.

### Toolbar

- Month picker: segmented control — two blue arrow buttons flanking centered `MM/YYYY` with blue-tinted background
- "Thêm xe" button: solid blue (`#1e40af`), white text, rounded 8px
- Period hint: small caption below toolbar showing period range

### Tab Bar

- Active tab: 2px solid blue bottom border, bold blue text
- Inactive tab: plain muted text, no border
- Thin separator below tabs

### Table — Header Row

- Background `#f9fafb`, 2px bottom border
- Uppercase 10px, weight 800 column headers
- Accent colors per category: Xăng dầu amber (`#92400e`), Sửa chữa green (`#065f46`), Khác purple (`#4c1d95`)

### Table — Vehicle Rows

- Alternating row tint (`#f9fafb` on odd rows)
- Biển số: monospace, weight 800, blue text on `#dbeafe` pill
- Lái xe: green pill badges (`#f0fdf4` bg, `#86efac` 1.5px border, `#166534` text), dashed "+" add button
- Expense cells: fuel in amber bold (`#b45309`), others muted, dash for empty
- Tổng CP: weight 900, dark text

### Table — Footer Row

- Background `#eff6ff`, 2px blue top border (`#1e40af`)
- Category totals in their accent colors, weight 800
- Grand total: large bold blue, weight 900

### Inline Editing

- Blue border + blue focus ring on active cell
- Enter saves, Escape cancels, blur saves

### Empty State

- Restyle icon and CTA with blue accent

### Locations Tab

- No structural changes to LocationManager
- Ensure search bar matches toolbar style (blue focus border, consistent height)

## Not In Scope

- No summary/KPI cards
- No layout restructuring
- No new features
- No backend changes
