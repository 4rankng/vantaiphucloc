export type Role = 'director' | 'dispatcher' | 'accountant' | 'driver'
export type TrailerType = '20FT' | '40FT'
export type JobStatus = 'DRAFT' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type ClientType = 'company' | 'individual'

export const ROLE_LABELS: Record<Role, string> = {
  director: 'Giám đốc',
  dispatcher: 'Điều hành',
  accountant: 'Kế toán',
  driver: 'Tài xế',
}

// ─── Vehicles (Real plates) ──────────────────────────────────────────────────

export interface Tractor {
  id: string
  licensePlate: string
  make: string
  model: string
  status: 'running' | 'idle' | 'maintenance'
  driverId?: string
  driverName?: string
  inspectionDue?: string
}

export interface Trailer {
  id: string
  licensePlate: string
  type: TrailerType
  status: 'in_use' | 'idle' | 'maintenance'
}

export interface Driver {
  id: string
  name: string
  phone: string
  tractorPlate: string
  fixedFeePerTrip: number
  totalTrips: number
  monthlyTrips: number
  monthlyRevenue: number
  rating: number
}

export interface Client {
  id: string
  name: string
  type: ClientType
  taxCode?: string
  address?: string
  phone: string
  contactPerson?: string
  outstandingDebt: number
}

export interface Partner {
  id: string
  name: string
  taxCode: string
  address: string
  phone: string
}

export interface Job {
  id: string
  jobDate: string
  tractorPlate: string
  trailerPlate: string
  trailerType: TrailerType
  driverId: string
  driverName: string
  clientId: string
  clientName: string
  containerNumber: string
  description: string
  route: string
  distanceKm: number
  revenue: number
  status: JobStatus
  driverFee: number
  isTwoWay: boolean
}

export interface Alert {
  id: string
  type: 'expense' | 'orphan' | 'maintenance' | 'overdue' | 'route'
  severity: 'high' | 'medium' | 'low'
  message: string
  timestamp: string
  jobId?: string
}

export interface ExpenseItem {
  id: string
  jobId: string
  tractorPlate: string
  driverName: string
  category: string
  amount: number
  description: string
  status: 'DRAFT' | 'APPROVED' | 'CANCELLED'
  date: string
}

export interface Invoice {
  id: string
  clientId: string
  clientName: string
  category: string
  containerSize: TrailerType
  containerCount: number
  route: string
  distanceKm: number
  amount: number
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'OVERDUE' | 'CANCELLED'
  issueDate: string
  dueDate: string
}

export interface LedgerEntry {
  id: string
  date: string
  clientName: string
  type: 'INVOICE' | 'PAYMENT_RECEIVED' | 'PARTNER_PAYMENT'
  debit: number
  credit: number
  reference: string
  notes: string
}

export interface RoutePrice {
  route: string
  type20ft: number
  type40ft: number
  isTwoWay?: boolean
}

export interface MonthlyRevenue {
  month: string
  revenue: number
  expense: number
}

export interface PeriodClose {
  id: string
  month: string
  closedBy: string
  closedAt: string
  totalRevenue: number
  totalExpense: number
  profit: number
  jobCount: number
  status: 'open' | 'closed'
}

// ─── REAL EXPENSE CATEGORIES ─────────────────────────────────────────────────

export const EXPENSE_CATEGORIES = [
  'Dầu',
  'Đi đường',
  'Sửa chữa',
  'Lốp',
  'Nhớt',
  'Lương lx',
  'Bảo hiểm',
  'Phí cầu đường',
]

// ─── REAL INVOICE CATEGORIES ─────────────────────────────────────────────────

export const INVOICE_CATEGORIES = [
  'Cước vận chuyển',
  'Phí lưu bãi',
  'Phí lưu vỏ',
  'Hợp đồng vận chuyển',
]

// ─── Mock Data ────────────────────────────────────────────────────────────────

export const mockTractors: Tractor[] = [
  { id: 'TRC-001', licensePlate: '15C-136.31', make: 'Howo', model: 'ZZ4257N3247C1', status: 'running', driverId: 'DRV-001', driverName: 'Nguyễn Văn Hùng' },
  { id: 'TRC-002', licensePlate: '15C-139.82', make: 'Howo', model: 'ZZ4257N3247C1', status: 'running', driverId: 'DRV-002', driverName: 'Trần Minh Tuấn' },
  { id: 'TRC-003', licensePlate: '15C-070.63', make: 'Freightliner', model: 'Columbia', status: 'running', driverId: 'DRV-003', driverName: 'Lê Hoàng Nam' },
  { id: 'TRC-004', licensePlate: '15C-180.99', make: 'Howo', model: 'ZZ4257N3247C1', status: 'idle', driverId: 'DRV-004', driverName: 'Phạm Đức Anh' },
]

export const mockTrailers: Trailer[] = [
  { id: 'TRL-001', licensePlate: '15R067.95', type: '40FT', status: 'in_use' },
  { id: 'TRL-002', licensePlate: '15R070.51', type: '40FT', status: 'in_use' },
  { id: 'TRL-003', licensePlate: '15R-128.07', type: '40FT', status: 'in_use' },
  { id: 'TRL-004', licensePlate: '15R-050.37', type: '40FT', status: 'in_use' },
  { id: 'TRL-005', licensePlate: '15R-111.22', type: '20FT', status: 'idle' },
  { id: 'TRL-006', licensePlate: '15R-099.88', type: '20FT', status: 'maintenance' },
]

export const mockDrivers: Driver[] = [
  { id: 'DRV-001', name: 'Nguyễn Văn Hùng', phone: '0912-345-678', tractorPlate: '15C-136.31', fixedFeePerTrip: 800000, totalTrips: 45, monthlyTrips: 12, monthlyRevenue: 32900000, rating: 4.8 },
  { id: 'DRV-002', name: 'Trần Minh Tuấn', phone: '0913-456-789', tractorPlate: '15C-139.82', fixedFeePerTrip: 800000, totalTrips: 38, monthlyTrips: 10, monthlyRevenue: 28200000, rating: 4.6 },
  { id: 'DRV-003', name: 'Lê Hoàng Nam', phone: '0914-567-890', tractorPlate: '15C-070.63', fixedFeePerTrip: 850000, totalTrips: 52, monthlyTrips: 15, monthlyRevenue: 42500000, rating: 4.9 },
  { id: 'DRV-004', name: 'Phạm Đức Anh', phone: '0915-678-901', tractorPlate: '15C-180.99', fixedFeePerTrip: 750000, totalTrips: 30, monthlyTrips: 8, monthlyRevenue: 16800000, rating: 4.3 },
]

export const mockClients: Client[] = [
  { id: 'CLT-001', name: 'Công ty CP Vận tải Hải Phòng', type: 'company', taxCode: '0200987654', address: 'Số 26 Vạn Mỹ, Ngô Quyền, Hải Phòng', phone: '0225-123-456', contactPerson: 'Nguyễn Thị Mai', outstandingDebt: 78000000 },
  { id: 'CLT-002', name: 'Công ty TNHH Sản xuất Mộc Châu', type: 'company', taxCode: '0520345678', address: 'Mộc Châu, Sơn La', phone: '022-234-567', contactPerson: 'Trần Văn Bình', outstandingDebt: 54800000 },
  { id: 'CLT-003', name: 'Tập đoàn Xuất nhập khẩu Lào Cai', type: 'company', taxCode: '0300567890', address: 'Lào Cai', phone: '020-345-678', contactPerson: 'Lê Minh Châu', outstandingDebt: 96000000 },
  { id: 'CLT-004', name: 'Công ty CP Thương mại Thái Bình', type: 'company', taxCode: '0220678901', address: 'Thái Bình', phone: '036-456-789', contactPerson: 'Phạm Thị Lan', outstandingDebt: 23000000 },
  { id: 'CLT-005', name: 'Doanh nghiệp Vận tải Quảng Ninh', type: 'company', taxCode: '0140890123', address: 'Hạ Long, Quảng Ninh', phone: '0203-567-890', contactPerson: 'Võ Thanh Tùng', outstandingDebt: 15800000 },
  { id: 'CLT-006', name: 'Anh Hoàng (Khách lẻ)', type: 'individual', phone: '0978-111-222', outstandingDebt: 0 },
  { id: 'CLT-007', name: 'Chị Lan (Khách lẻ)', type: 'individual', phone: '0979-222-333', outstandingDebt: 1150000 },
  { id: 'CLT-008', name: 'Công ty TNHH Xây dựng Tuyên Quang', type: 'company', taxCode: '0240901234', address: 'Tuyên Quang', phone: '027-678-901', contactPerson: 'Nguyễn Đức Minh', outstandingDebt: 37800000 },
]

export const mockPartners: Partner[] = [
  { id: 'PTR-001', name: 'Nhà xe Hưng Long', taxCode: '0400123456', address: 'KCN Đình Vũ, Hải Phòng', phone: '0225-999-888' },
  { id: 'PTR-002', name: 'Garage Phú Cường', taxCode: '0400654321', address: 'Đường B, KCN Đình Vũ, Hải Phòng', phone: '0225-777-666' },
  { id: 'PTR-003', name: 'Cửa hàng lốp Hoàng Anh', taxCode: '0400987654', address: 'Ngô Quyền, Hải Phòng', phone: '0225-555-444' },
]

// Real routes & prices from allowance_by_routes
export const mockRoutePrices: RoutePrice[] = [
  { route: 'Hải Phòng → Mộc Châu, Sơn La', type20ft: 2470000, type40ft: 2740000 },
  { route: 'Hải Phòng → Sa Pa', type20ft: 0, type40ft: 4800000 },
  { route: 'Hải Phòng → Lào Cai', type20ft: 3300000, type40ft: 4280000 },
  { route: 'Hải Phòng → Hà Nội (QL5)', type20ft: 930000, type40ft: 1150000 },
  { route: 'Hải Phòng → Hải Dương', type20ft: 600000, type40ft: 700000 },
  { route: 'Hải Phòng → Hạ Long, Quảng Ninh', type20ft: 680000, type40ft: 790000 },
  { route: 'Hải Phòng → Thái Nguyên', type20ft: 1020000, type40ft: 1190000 },
  { route: 'Hải Phòng → TP. Tuyên Quang', type20ft: 1720000, type40ft: 1890000 },
  { route: 'Hải Phòng → Việt Trì, Phú Thọ (QL2+CT)', type20ft: 1250000, type40ft: 1550000 },
  { route: 'Hải Phòng → Thanh Hóa', type20ft: 890000, type40ft: 1000000 },
  { route: 'Hải Phòng → Hà Giang', type20ft: 2270000, type40ft: 2320000 },
  { route: 'Hải Phòng → CK Hữu Nghị, Lạng Sơn', type20ft: 1900000, type40ft: 2200000 },
  { route: 'Hải Phòng → TP. Vinh, Nghệ An', type20ft: 1610000, type40ft: 1720000 },
  { route: 'Hải Phòng → Bắc Ninh → Ninh Bình (Kết hợp 2 chiều)', type20ft: 1500000, type40ft: 1780000, isTwoWay: true },
  { route: 'Hải Phòng → Ngoại thành (>20km)', type20ft: 300000, type40ft: 300000 },
  { route: 'Hải Phòng → Nội thành (<20km)', type20ft: 200000, type40ft: 200000 },
]

export const mockJobs: Job[] = [
  {
    id: 'JOB-001', jobDate: '2025-04-20',
    tractorPlate: '15C-136.31', trailerPlate: '15R067.95', trailerType: '40FT',
    driverId: 'DRV-001', driverName: 'Nguyễn Văn Hùng',
    clientId: 'CLT-002', clientName: 'Công ty TNHH Sản xuất Mộc Châu',
    containerNumber: 'MSKU-7283456', description: 'Chở hàng nông sản Mộc Châu',
    route: 'Hải Phòng → Mộc Châu, Sơn La', distanceKm: 340,
    revenue: 2740000, status: 'IN_PROGRESS', driverFee: 800000, isTwoWay: false,
  },
  {
    id: 'JOB-002', jobDate: '2025-04-20',
    tractorPlate: '15C-139.82', trailerPlate: '15R070.51', trailerType: '40FT',
    driverId: 'DRV-002', driverName: 'Trần Minh Tuấn',
    clientId: 'CLT-003', clientName: 'Tập đoàn Xuất nhập khẩu Lào Cai',
    containerNumber: 'TCNU-9120345', description: 'Trả hàng + đóng hàng',
    route: 'Hải Phòng → Sa Pa', distanceKm: 460,
    revenue: 4800000, status: 'IN_PROGRESS', driverFee: 800000, isTwoWay: false,
  },
  {
    id: 'JOB-003', jobDate: '2025-04-20',
    tractorPlate: '15C-070.63', trailerPlate: '15R-128.07', trailerType: '40FT',
    driverId: 'DRV-003', driverName: 'Lê Hoàng Nam',
    clientId: 'CLT-001', clientName: 'Công ty CP Vận tải Hải Phòng',
    containerNumber: 'HLCU-5544123', description: 'Hàng kết hợp 2 chiều',
    route: 'Hải Phòng → Bắc Ninh → Ninh Bình (Kết hợp 2 chiều)', distanceKm: 220,
    revenue: 1780000, status: 'IN_PROGRESS', driverFee: 850000, isTwoWay: true,
  },
  {
    id: 'JOB-004', jobDate: '2025-04-20',
    tractorPlate: '15C-180.99', trailerPlate: '15R-050.37', trailerType: '40FT',
    driverId: 'DRV-004', driverName: 'Phạm Đức Anh',
    clientId: 'CLT-004', clientName: 'Công ty CP Thương mại Thái Bình',
    containerNumber: 'CSLU-3321456', description: 'Chở hàng tiêu dùng',
    route: 'Hải Phòng → Hải Dương', distanceKm: 60,
    revenue: 700000, status: 'PLANNED', driverFee: 750000, isTwoWay: false,
  },
  {
    id: 'JOB-005', jobDate: '2025-04-19',
    tractorPlate: '15C-136.31', trailerPlate: '15R067.95', trailerType: '40FT',
    driverId: 'DRV-001', driverName: 'Nguyễn Văn Hùng',
    clientId: 'CLT-001', clientName: 'Công ty CP Vận tải Hải Phòng',
    containerNumber: 'MSKU-1122987', description: 'Cước vận chuyển hàng điện tử',
    route: 'Hải Phòng → Hà Nội (QL5)', distanceKm: 125,
    revenue: 1150000, status: 'COMPLETED', driverFee: 800000, isTwoWay: false,
  },
  {
    id: 'JOB-006', jobDate: '2025-04-19',
    tractorPlate: '15C-139.82', trailerPlate: '15R070.51', trailerType: '40FT',
    driverId: 'DRV-002', driverName: 'Trần Minh Tuấn',
    clientId: 'CLT-005', clientName: 'Doanh nghiệp Vận tải Quảng Ninh',
    containerNumber: 'TCNU-6677890', description: 'Chở vật liệu xây dựng',
    route: 'Hải Phòng → Hạ Long, Quảng Ninh', distanceKm: 65,
    revenue: 790000, status: 'COMPLETED', driverFee: 800000, isTwoWay: false,
  },
  {
    id: 'JOB-007', jobDate: '2025-04-18',
    tractorPlate: '15C-070.63', trailerPlate: '15R-128.07', trailerType: '40FT',
    driverId: 'DRV-003', driverName: 'Lê Hoàng Nam',
    clientId: 'CLT-008', clientName: 'Công ty TNHH Xây dựng Tuyên Quang',
    containerNumber: 'HLCU-8899012', description: 'Chở thép xây dựng',
    route: 'Hải Phòng → TP. Tuyên Quang', distanceKm: 190,
    revenue: 1890000, status: 'COMPLETED', driverFee: 850000, isTwoWay: false,
  },
  {
    id: 'JOB-008', jobDate: '2025-04-18',
    tractorPlate: '15C-136.31', trailerPlate: '15R067.95', trailerType: '40FT',
    driverId: 'DRV-001', driverName: 'Nguyễn Văn Hùng',
    clientId: 'CLT-003', clientName: 'Tập đoàn Xuất nhập khẩu Lào Cai',
    containerNumber: 'MSKU-4455667', description: 'Hàng kết hợp 2 chiều',
    route: 'Hải Phòng → Lào Cai', distanceKm: 380,
    revenue: 4280000, status: 'COMPLETED', driverFee: 800000, isTwoWay: false,
  },
  {
    id: 'JOB-009', jobDate: '2025-04-21',
    tractorPlate: '15C-180.99', trailerPlate: '15R-111.22', trailerType: '20FT',
    driverId: 'DRV-004', driverName: 'Phạm Đức Anh',
    clientId: 'CLT-006', clientName: 'Anh Hoàng (Khách lẻ)',
    containerNumber: 'CSLU-2233445', description: 'Chở hàng lẻ nội thành',
    route: 'Hải Phòng → Nội thành (<20km)', distanceKm: 15,
    revenue: 200000, status: 'PLANNED', driverFee: 750000, isTwoWay: false,
  },
  {
    id: 'JOB-010', jobDate: '2025-04-21',
    tractorPlate: '15C-070.63', trailerPlate: '15R-128.07', trailerType: '40FT',
    driverId: 'DRV-003', driverName: 'Lê Hoàng Nam',
    clientId: 'CLT-001', clientName: 'Công ty CP Vận tải Hải Phòng',
    containerNumber: 'HLCU-9988776', description: 'Chở hàng thái nguyên',
    route: 'Hải Phòng → Thái Nguyên', distanceKm: 155,
    revenue: 1190000, status: 'PLANNED', driverFee: 850000, isTwoWay: false,
  },
]

export const mockAlerts: Alert[] = [
  { id: 'ALT-001', type: 'maintenance', severity: 'high', message: 'Đầu kéo 15C-070.63 sắp hết hạn đăng kiểm (25/04)', timestamp: '10 phút trước' },
  { id: 'ALT-002', type: 'expense', severity: 'medium', message: 'Chi phí dầu vượt định mức JOB-002 (15C-139.82)', timestamp: '25 phút trước', jobId: 'JOB-002' },
  { id: 'ALT-003', type: 'overdue', severity: 'high', message: 'Công nợ Tập đoàn Lào Cai quá hạn 7 ngày (96 triệu)', timestamp: '1 giờ trước' },
  { id: 'ALT-004', type: 'maintenance', severity: 'high', message: 'Rơ mooc 15R-099.88 đang bảo dưỡng quá hạn', timestamp: '2 giờ trước' },
  { id: 'ALT-005', type: 'expense', severity: 'medium', message: 'Lốp xe 15C-136.31 cần thay mới', timestamp: '3 giờ trước' },
  { id: 'ALT-006', type: 'route', severity: 'low', message: 'QL5 tắc đường khu vực Hải Dương', timestamp: '4 giờ trước' },
  { id: 'ALT-007', type: 'overdue', severity: 'medium', message: 'Công nợ CT Thương mại Thái Bình quá hạn 3 ngày', timestamp: '5 giờ trước' },
]

export const mockExpenses: ExpenseItem[] = [
  { id: 'EXP-001', jobId: 'JOB-001', tractorPlate: '15C-136.31', driverName: 'Nguyễn Văn Hùng', category: 'Dầu', amount: 850000, description: 'Đổ dầu HP → Mộc Châu', status: 'DRAFT', date: '2025-04-20' },
  { id: 'EXP-002', jobId: 'JOB-002', tractorPlate: '15C-139.82', driverName: 'Trần Minh Tuấn', category: 'Phí cầu đường', amount: 380000, description: 'Phí BOT cao tốc HP → Lào Cai', status: 'DRAFT', date: '2025-04-20' },
  { id: 'EXP-003', jobId: 'JOB-003', tractorPlate: '15C-070.63', driverName: 'Lê Hoàng Nam', category: 'Đi đường', amount: 1780000, description: 'Tiền đi đường kết hợp 2 chiều', status: 'DRAFT', date: '2025-04-20' },
  { id: 'EXP-004', jobId: 'JOB-005', tractorPlate: '15C-136.31', driverName: 'Nguyễn Văn Hùng', category: 'Dầu', amount: 520000, description: 'Đổ dầu HP → Hà Nội', status: 'DRAFT', date: '2025-04-19' },
  { id: 'EXP-005', jobId: 'JOB-006', tractorPlate: '15C-139.82', driverName: 'Trần Minh Tuấn', category: 'Sửa chữa', amount: 2100000, description: 'Thay lốp xe tại garage', status: 'DRAFT', date: '2025-04-19' },
  { id: 'EXP-006', jobId: 'JOB-005', tractorPlate: '15C-136.31', driverName: 'Nguyễn Văn Hùng', category: 'Phí cầu đường', amount: 115000, description: 'BOT QL5', status: 'DRAFT', date: '2025-04-19' },
  { id: 'EXP-007', jobId: 'JOB-007', tractorPlate: '15C-070.63', driverName: 'Lê Hoàng Nam', category: 'Dầu', amount: 680000, description: 'Đổ dầu HP → Tuyên Quang', status: 'DRAFT', date: '2025-04-18' },
  { id: 'EXP-008', jobId: 'JOB-008', tractorPlate: '15C-136.31', driverName: 'Nguyễn Văn Hùng', category: 'Đi đường', amount: 4280000, description: 'Tiền đi đường HP → Lào Cai', status: 'DRAFT', date: '2025-04-18' },
  { id: 'EXP-009', jobId: 'JOB-008', tractorPlate: '15C-136.31', driverName: 'Nguyễn Văn Hùng', category: 'Nhớt', amount: 450000, description: 'Thay nhớt động cơ', status: 'DRAFT', date: '2025-04-18' },
  { id: 'EXP-010', jobId: '', tractorPlate: '15C-180.99', driverName: 'Phạm Đức Anh', category: 'Lương lx', amount: 6000000, description: 'Lương tài xế tháng 4', status: 'DRAFT', date: '2025-04-15' },
  { id: 'EXP-011', jobId: '', tractorPlate: '15C-136.31', driverName: '', category: 'Bảo hiểm', amount: 3200000, description: 'Bảo hiểm đầu kéo quý 2/2025', status: 'DRAFT', date: '2025-04-01' },
  { id: 'EXP-012', jobId: '', tractorPlate: '15R-050.37', driverName: '', category: 'Sửa chữa', amount: 4500000, description: 'Sửa sàn rơ mooc', status: 'DRAFT', date: '2025-04-10' },
]

export const mockInvoices: Invoice[] = [
  { id: 'INV-001', clientId: 'CLT-001', clientName: 'Công ty CP Vận tải Hải Phòng', category: 'Cước vận chuyển', containerSize: '40FT', containerCount: 1, route: 'Hải Phòng → Hà Nội (QL5)', distanceKm: 125, amount: 1150000, status: 'PAID', issueDate: '2025-04-05', dueDate: '2025-04-15' },
  { id: 'INV-002', clientId: 'CLT-002', clientName: 'Công ty TNHH Sản xuất Mộc Châu', category: 'Cước vận chuyển', containerSize: '40FT', containerCount: 1, route: 'Hải Phòng → Mộc Châu, Sơn La', distanceKm: 340, amount: 2740000, status: 'ISSUED', issueDate: '2025-04-10', dueDate: '2025-04-25' },
  { id: 'INV-003', clientId: 'CLT-003', clientName: 'Tập đoàn Xuất nhập khẩu Lào Cai', category: 'Cước vận chuyển', containerSize: '40FT', containerCount: 1, route: 'Hải Phòng → Sa Pa', distanceKm: 460, amount: 4800000, status: 'ISSUED', issueDate: '2025-04-12', dueDate: '2025-04-27' },
  { id: 'INV-004', clientId: 'CLT-003', clientName: 'Tập đoàn Xuất nhập khẩu Lào Cai', category: 'Phí lưu vỏ', containerSize: '40FT', containerCount: 1, route: '', distanceKm: 0, amount: 850000, status: 'OVERDUE', issueDate: '2025-03-20', dueDate: '2025-04-05' },
  { id: 'INV-005', clientId: 'CLT-001', clientName: 'Công ty CP Vận tải Hải Phòng', category: 'Hợp đồng vận chuyển', containerSize: '40FT', containerCount: 1, route: 'Hải Phòng → Bắc Ninh → Ninh Bình (Kết hợp 2 chiều)', distanceKm: 220, amount: 1780000, status: 'PAID', issueDate: '2025-04-08', dueDate: '2025-04-18' },
  { id: 'INV-006', clientId: 'CLT-005', clientName: 'Doanh nghiệp Vận tải Quảng Ninh', category: 'Cước vận chuyển', containerSize: '40FT', containerCount: 1, route: 'Hải Phòng → Hạ Long, Quảng Ninh', distanceKm: 65, amount: 790000, status: 'PAID', issueDate: '2025-04-06', dueDate: '2025-04-16' },
  { id: 'INV-007', clientId: 'CLT-008', clientName: 'Công ty TNHH Xây dựng Tuyên Quang', category: 'Cước vận chuyển', containerSize: '40FT', containerCount: 1, route: 'Hải Phòng → TP. Tuyên Quang', distanceKm: 190, amount: 1890000, status: 'ISSUED', issueDate: '2025-04-14', dueDate: '2025-04-29' },
  { id: 'INV-008', clientId: 'CLT-004', clientName: 'Công ty CP Thương mại Thái Bình', category: 'Phí lưu bãi', containerSize: '40FT', containerCount: 1, route: '', distanceKm: 0, amount: 650000, status: 'ISSUED', issueDate: '2025-04-11', dueDate: '2025-04-26' },
  { id: 'INV-009', clientId: 'CLT-003', clientName: 'Tập đoàn Xuất nhập khẩu Lào Cai', category: 'Cước vận chuyển', containerSize: '40FT', containerCount: 1, route: 'Hải Phòng → Lào Cai', distanceKm: 380, amount: 4280000, status: 'PAID', issueDate: '2025-04-03', dueDate: '2025-04-13' },
  { id: 'INV-010', clientId: 'CLT-001', clientName: 'Công ty CP Vận tải Hải Phòng', category: 'Cước vận chuyển', containerSize: '40FT', containerCount: 1, route: 'Hải Phòng → Thái Nguyên', distanceKm: 155, amount: 1190000, status: 'PAID', issueDate: '2025-04-04', dueDate: '2025-04-14' },
  { id: 'INV-011', clientId: 'CLT-007', clientName: 'Chị Lan (Khách lẻ)', category: 'Cước vận chuyển', containerSize: '20FT', containerCount: 1, route: 'Hải Phòng → Hải Dương', distanceKm: 60, amount: 600000, status: 'PAID', issueDate: '2025-04-09', dueDate: '2025-04-09' },
  { id: 'INV-012', clientId: 'CLT-002', clientName: 'Công ty TNHH Sản xuất Mộc Châu', category: 'Cước vận chuyển', containerSize: '40FT', containerCount: 1, route: 'Hải Phòng → Mộc Châu, Sơn La', distanceKm: 340, amount: 2740000, status: 'PAID', issueDate: '2025-04-02', dueDate: '2025-04-12' },
  { id: 'INV-013', clientId: 'CLT-001', clientName: 'Công ty CP Vận tải Hải Phòng', category: 'Phí lưu bãi', containerSize: '40FT', containerCount: 1, route: '', distanceKm: 0, amount: 450000, status: 'PAID', issueDate: '2025-04-07', dueDate: '2025-04-17' },
  { id: 'INV-014', clientId: 'CLT-004', clientName: 'Công ty CP Thương mại Thái Bình', category: 'Cước vận chuyển', containerSize: '40FT', containerCount: 1, route: 'Hải Phòng → Hải Dương', distanceKm: 60, amount: 700000, status: 'ISSUED', issueDate: '2025-04-15', dueDate: '2025-04-30' },
  { id: 'INV-015', clientId: 'CLT-006', clientName: 'Anh Hoàng (Khách lẻ)', category: 'Cước vận chuyển', containerSize: '20FT', containerCount: 1, route: 'Hải Phòng → Nội thành (<20km)', distanceKm: 15, amount: 200000, status: 'PAID', issueDate: '2025-04-13', dueDate: '2025-04-13' },
]

export const mockLedger: LedgerEntry[] = [
  { id: 'LDG-001', date: '2025-04-15', clientName: 'Công ty CP Vận tải HP', type: 'INVOICE', debit: 1190000, credit: 0, reference: 'INV-010', notes: 'Cước HP → Thái Nguyên' },
  { id: 'LDG-002', date: '2025-04-14', clientName: 'Công ty TNHH Xây dựng TQ', type: 'INVOICE', debit: 1890000, credit: 0, reference: 'INV-007', notes: 'Cước HP → Tuyên Quang' },
  { id: 'LDG-003', date: '2025-04-13', clientName: 'Anh Hoàng (Khách lẻ)', type: 'PAYMENT_RECEIVED', debit: 0, credit: 200000, reference: 'PT-045', notes: 'Thu tiền mặt' },
  { id: 'LDG-004', date: '2025-04-12', clientName: 'Tập đoàn XNK Lào Cai', type: 'INVOICE', debit: 4800000, credit: 0, reference: 'INV-003', notes: 'Cước HP → Sa Pa' },
  { id: 'LDG-005', date: '2025-04-11', clientName: 'Công ty CP TM Thái Bình', type: 'INVOICE', debit: 650000, credit: 0, reference: 'INV-008', notes: 'Phí lưu bãi' },
  { id: 'LDG-006', date: '2025-04-10', clientName: 'Nhà xe Hưng Long', type: 'PARTNER_PAYMENT', debit: 0, credit: 5200000, reference: 'PC-089', notes: 'Trả tiền đối tác vận chuyển' },
  { id: 'LDG-007', date: '2025-04-09', clientName: 'Công ty CP Vận tải HP', type: 'PAYMENT_RECEIVED', debit: 0, credit: 1190000, reference: 'PT-044', notes: 'Chuyển khoản' },
  { id: 'LDG-008', date: '2025-04-08', clientName: 'Công ty CP Vận tải HP', type: 'INVOICE', debit: 1780000, credit: 0, reference: 'INV-005', notes: 'Hàng kết hợp 2 chiều' },
]

export const mockMonthlyRevenue: MonthlyRevenue[] = [
  { month: '11/2024', revenue: 180000000, expense: 140000000 },
  { month: '12/2024', revenue: 210000000, expense: 160000000 },
  { month: '01/2025', revenue: 195000000, expense: 150000000 },
  { month: '02/2025', revenue: 170000000, expense: 135000000 },
  { month: '03/2025', revenue: 220000000, expense: 165000000 },
  { month: '04/2025', revenue: 24800000, expense: 18200000 },
]

export const mockPeriodCloses: PeriodClose[] = [
  { id: 'PC-001', month: '03/2025', closedBy: 'Kế toán Trần Hoa', closedAt: '2025-04-02 09:30', totalRevenue: 220000000, totalExpense: 165000000, profit: 55000000, jobCount: 68, status: 'closed' },
  { id: 'PC-002', month: '02/2025', closedBy: 'Giám đốc Nguyễn Khoa', closedAt: '2025-03-03 14:15', totalRevenue: 170000000, totalExpense: 135000000, profit: 35000000, jobCount: 52, status: 'closed' },
  { id: 'PC-003', month: '01/2025', closedBy: 'Kế toán Trần Hoa', closedAt: '2025-02-01 10:00', totalRevenue: 195000000, totalExpense: 150000000, profit: 45000000, jobCount: 60, status: 'closed' },
  { id: 'PC-004', month: '04/2025', closedBy: '', closedAt: '', totalRevenue: 24800000, totalExpense: 18200000, profit: 6600000, jobCount: 10, status: 'open' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatCurrency(amount: number): string {
  if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(1)} tỷ VNĐ`
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)} triệu VNĐ`
  return amount.toLocaleString('vi-VN') + ' VNĐ'
}

export function formatCurrencyFull(amount: number): string {
  return amount.toLocaleString('vi-VN') + ' ₫'
}

export function formatCurrencyShort(amount: number): string {
  if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(2).replace(/\.?0+$/, '')} tỷ`
  return amount.toLocaleString('vi-VN') + ' ₫'
}

export function getContainerBadgeColor(type: TrailerType): string {
  switch (type) {
    case '20FT': return 'bg-blue-100 text-blue-700'
    case '40FT': return 'bg-emerald-100 text-emerald-700'
  }
}

export function getJobStatusBadge(status: JobStatus): { variant: 'default'|'success'|'warning'|'danger'|'info'|'neutral'; label: string } {
  switch (status) {
    case 'DRAFT': return { variant: 'neutral', label: 'Nháp' }
    case 'PLANNED': return { variant: 'warning', label: 'Lên kế hoạch' }
    case 'IN_PROGRESS': return { variant: 'success', label: 'Đang chạy' }
    case 'COMPLETED': return { variant: 'info', label: 'Hoàn thành' }
    case 'CANCELLED': return { variant: 'danger', label: 'Huỷ' }
  }
}
