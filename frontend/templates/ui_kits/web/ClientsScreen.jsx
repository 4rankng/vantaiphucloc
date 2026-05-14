/* eslint-disable */
// ClientsScreen — partner directory; logo monogram + meta, no IDs.

function ClientsScreen({ onOpenClient }) {
  const [q, setQ] = React.useState('');
  const clients = [
    { name: 'Pan Pacific Logistics',  logo: 'PP', type: 'Doanh nghiệp', contact: 'Trần Thuý An',     phone: '0912 458 102', debt: '12.450.000 ₫',  trips: 38, tone: 'info' },
    { name: 'Maersk Line Việt Nam',   logo: 'ML', type: 'Doanh nghiệp', contact: 'Nguyễn Hữu Quân', phone: '0903 218 904', debt: '142.900.000 ₫', trips: 62, tone: 'info', danger: true },
    { name: 'Hapag-Lloyd VN',         logo: 'HL', type: 'Doanh nghiệp', contact: 'Vũ Thanh Nga',    phone: '0988 124 002', debt: '18.200.000 ₫',  trips: 24, tone: 'info' },
    { name: 'CMA CGM Việt Nam',       logo: 'CC', type: 'Doanh nghiệp', contact: 'Phạm Quang Huy',  phone: '0966 902 481', debt: '—',             trips: 19, tone: 'info' },
    { name: 'Anh Trần Văn Hưng',      logo: 'TH', type: 'Cá nhân',      contact: '—',                phone: '0905 821 477', debt: '2.100.000 ₫',   trips: 4,  tone: 'neutral' },
    { name: 'ONE Việt Nam',           logo: 'ON', type: 'Doanh nghiệp', contact: 'Lê Thuý Hằng',    phone: '0975 401 220', debt: '6.800.000 ₫',   trips: 16, tone: 'info' },
    { name: 'Evergreen Marine',       logo: 'EM', type: 'Doanh nghiệp', contact: 'Hoàng Anh Tuấn',  phone: '0908 712 339', debt: '—',             trips: 22, tone: 'info' },
  ];
  const filtered = clients.filter(c => !q || (c.name + c.contact + c.phone).toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Khách hàng &amp; nhà thầu</h1>
          <p>{filtered.length} đối tác đang hoạt động</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary"><Icon.Download size={14} /> Xuất danh sách</button>
          <button className="btn btn-primary"><Icon.Plus size={14} /> Thêm khách hàng</button>
        </div>
      </div>

      <div className="card-shell">
        <div className="toolbar">
          <div className="input-icon">
            <Icon.Search />
            <input className="input" placeholder="Tìm theo tên, người liên hệ, số điện thoại…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div style={{ flex: 1 }} />
          <span className="badge badge-outline">Tổng công nợ: 184.450.000 ₫</span>
        </div>

        <table className="tt-table">
          <thead>
            <tr>
              <th style={{ width: '36%' }}>Khách hàng</th>
              <th>Loại</th>
              <th>Liên hệ</th>
              <th>Điện thoại</th>
              <th style={{ textAlign: 'right' }}>Chuyến</th>
              <th style={{ textAlign: 'right' }}>Công nợ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr key={i} onClick={() => onOpenClient?.(c)}>
                <td>
                  <div className="partner-cell">
                    <div className="logo">{c.logo}</div>
                    <div className="meta">
                      <div className="name">{c.name}</div>
                      <div className="sub">{c.trips} chuyến tháng này</div>
                    </div>
                  </div>
                </td>
                <td><span className={`badge badge-${c.tone}`}>{c.type === 'Doanh nghiệp' ? 'DN' : 'Cá nhân'}</span></td>
                <td>{c.contact}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{c.phone}</td>
                <td className="num">{c.trips}</td>
                <td className={`num ${c.debt === '—' ? 'muted' : ''}`} style={{ color: c.danger ? 'var(--danger)' : undefined }}>{c.debt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

Object.assign(window, { ClientsScreen });
