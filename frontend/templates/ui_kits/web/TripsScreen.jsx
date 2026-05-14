/* eslint-disable */
// TripsScreen — partner-first table; no internal order codes user-facing.

function TripsScreen({ onOpenTrip }) {
  const [tab, setTab] = React.useState('all');
  const [q, setQ] = React.useState('');

  const rows = [
    { partner: 'Pan Pacific Logistics', logo: 'PP', route: ['Hải Phòng', 'Bắc Ninh'],     km: 92,  type: 'CONT 40', driver: 'Nguyễn Văn Hùng',   plate: '15C-12345', status: 'success', label: 'Đã khớp',  revenue: '8.450.000 ₫',  date: '22/04' },
    { partner: 'Maersk Line Việt Nam',  logo: 'ML', route: ['Lạch Huyện', 'Hà Nội'],      km: 108, type: 'CONT 40', driver: null,                  plate: null,        status: 'warning', label: 'Chờ xử lý', revenue: '12.900.000 ₫', date: '22/04' },
    { partner: 'Hapag-Lloyd VN',        logo: 'HL', route: ['Hải Phòng', 'Hưng Yên'],     km: 88,  type: 'CONT 20', driver: 'Trần Đình Sơn',      plate: '15C-23910', status: 'brand',   label: 'Đang chạy',revenue: '6.200.000 ₫',  date: '21/04' },
    { partner: 'CMA CGM Việt Nam',      logo: 'CC', route: ['Đình Vũ', 'Hải Dương'],      km: 72,  type: 'CONT 20', driver: 'Phạm Quốc Bảo',      plate: '15C-87104', status: 'success', label: 'Đã khớp',  revenue: '7.350.000 ₫',  date: '21/04' },
    { partner: 'PIL Vietnam',           logo: 'PL', route: ['Hải Phòng', 'Hà Nam'],       km: 95,  type: 'CONT 40', driver: null,                  plate: null,        status: 'neutral', label: 'Đã huỷ',   revenue: '— ₫',          date: '20/04' },
    { partner: 'Evergreen Marine',      logo: 'EM', route: ['Tân Vũ', 'Vĩnh Phúc'],       km: 96,  type: 'CONT 40', driver: 'Lê Minh Quân',       plate: '15C-44521', status: 'success', label: 'Đã khớp',  revenue: '9.100.000 ₫',  date: '20/04' },
    { partner: 'ONE Việt Nam',          logo: 'ON', route: ['Hải Phòng', 'Thái Bình'],    km: 89,  type: 'CONT 20', driver: 'Đỗ Quang Hải',       plate: '15C-50872', status: 'brand',   label: 'Đang chạy',revenue: '5.800.000 ₫',  date: '19/04' },
    { partner: 'Yang Ming Line',        logo: 'YM', route: ['Đình Vũ', 'Hà Nội'],         km: 112, type: 'CONT 40', driver: 'Vũ Văn Lâm',         plate: '15C-19403', status: 'success', label: 'Đã khớp',  revenue: '11.250.000 ₫', date: '19/04' },
  ];

  const filtered = rows
    .filter(r => tab === 'all' || (tab === 'pending' && r.status === 'warning') || (tab === 'running' && r.status === 'brand') || (tab === 'done' && r.status === 'success'))
    .filter(r => !q || (r.partner + ' ' + r.route.join(' ') + ' ' + (r.driver || '')).toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Lệnh vận chuyển</h1>
          <p>{filtered.length} lệnh trong tháng 4, 2026</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary"><Icon.Filter size={14} /> Bộ lọc</button>
          <button className="btn btn-secondary"><Icon.Download size={14} /> Xuất Excel</button>
          <button className="btn btn-primary"><Icon.Plus size={14} /> Tạo lệnh</button>
        </div>
      </div>

      <div className="card-shell">
        <div className="toolbar">
          <div className="input-icon">
            <Icon.Search />
            <input
              className="input"
              placeholder="Tìm khách hàng, tài xế, biển số xe…"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }} />
          <div className="tab-row">
            <button className={tab === 'all' ? 'active' : ''}     onClick={() => setTab('all')}>Tất cả</button>
            <button className={tab === 'pending' ? 'active' : ''} onClick={() => setTab('pending')}>Chờ xử lý</button>
            <button className={tab === 'running' ? 'active' : ''} onClick={() => setTab('running')}>Đang chạy</button>
            <button className={tab === 'done' ? 'active' : ''}    onClick={() => setTab('done')}>Đã khớp</button>
          </div>
        </div>

        <table className="tt-table">
          <thead>
            <tr>
              <th style={{ width: '30%' }}>Khách hàng</th>
              <th>Tuyến</th>
              <th>Tài xế</th>
              <th>Trạng thái</th>
              <th style={{ textAlign: 'right' }}>Doanh thu</th>
              <th style={{ textAlign: 'right' }}>Ngày</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i} onClick={() => onOpenTrip?.(r)}>
                <td>
                  <div className="partner-cell">
                    <div className="logo">{r.logo}</div>
                    <div className="meta">
                      <div className="name">{r.partner}</div>
                      <div className="sub">{r.type} · {r.km} km</div>
                    </div>
                  </div>
                </td>
                <td className="route">{r.route[0]} <span className="arrow">→</span> {r.route[1]}</td>
                <td>
                  <div className="driver-cell">
                    <span className="av"><Icon.User size={13} /></span>
                    {r.driver ? (
                      <span className="nm">{r.driver}<span style={{ color: 'var(--fg-3)', fontFamily: 'var(--font-mono)', fontSize: 11, marginLeft: 6 }}>{r.plate}</span></span>
                    ) : <span className="nm empty">Chưa gán</span>}
                  </div>
                </td>
                <td><span className={`badge badge-${r.status}`}><span className="dot"></span>{r.label}</span></td>
                <td className={`num ${r.revenue.includes('—') ? 'muted' : ''}`}>{r.revenue}</td>
                <td className="date">{r.date}</td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 60, textAlign: 'center' }}>
                <img src="../../assets/illustrations/empty-trips.svg" alt="" style={{ width: 160, margin: '0 auto 12px' }} />
                <div style={{ fontWeight: 600, color: 'var(--fg-1)' }}>Không có lệnh nào khớp</div>
                <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 4 }}>Thử thay đổi bộ lọc hoặc từ khoá</div>
              </td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}

Object.assign(window, { TripsScreen });
