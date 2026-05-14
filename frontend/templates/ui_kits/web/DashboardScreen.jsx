/* eslint-disable */
// DashboardScreen — director / accountant overview.

function StatCard({ label, value, currency, trend, trendDir, icon, tone = 'brand', sparkPath, sparkColor }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <div className={`stat-icon ${tone}`}>{icon}</div>
        {trend ? (
          <span className={`stat-trend ${trendDir}`}>
            {trendDir === 'up'
              ? <svg viewBox="0 0 24 24"><polyline points="6 14 12 8 18 14" stroke="currentColor" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              : <svg viewBox="0 0 24 24"><polyline points="6 10 12 16 18 10" stroke="currentColor" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            {trend}
          </span>
        ) : null}
      </div>
      <p className="stat-label">{label}</p>
      <div className="stat-value">{value}{currency ? <span className="currency">{currency}</span> : null}</div>
      <div className="spark">
        <svg viewBox="0 0 100 22" preserveAspectRatio="none">
          <polyline fill="none" stroke={sparkColor} strokeWidth="1.2" points={sparkPath} />
        </svg>
      </div>
    </div>
  );
}

function MonthBar({ counts, max }) {
  return (
    <div>
      <div className="chart-bars">
        {counts.map((n, i) => {
          const h = max ? Math.max(4, (n / max) * 160) : 4;
          const muted = n === 0;
          return <div key={i} className={`bar ${muted ? 'muted' : ''}`} style={{ height: h }} title={`Ngày ${i+1}: ${n} chuyến`} />;
        })}
      </div>
      <div className="chart-x">
        <span>1</span><span>5</span><span>10</span><span>15</span><span>20</span><span>25</span><span>{counts.length}</span>
      </div>
    </div>
  );
}

function DashboardScreen({ role, onOpenTrip }) {
  const monthLabel = 'Tháng 4, 2026';

  const stats = [
    { label: 'Tổng chuyến', value: '412', trend: '+8.2%',  trendDir: 'up',   tone: 'brand',   icon: <Icon.Truck size={16} />,       sparkColor: '#10B981', sparkPath: '0,16 10,15 20,14 30,12 40,13 50,9 60,11 70,7 80,8 90,5 100,4' },
    { label: 'Đã khớp',     value: '368', trend: '+12%',   trendDir: 'up',   tone: 'success', icon: <Icon.CheckCircle size={16} />, sparkColor: '#10B981', sparkPath: '0,18 10,17 20,15 30,14 40,11 50,10 60,8 70,7 80,5 90,4 100,3' },
    { label: 'Chờ xử lý',   value: '44',  trend: '−4.1%',  trendDir: 'down', tone: 'warning', icon: <Icon.AlertCircle size={16} />, sparkColor: '#A1A1AA', sparkPath: '0,6 10,7 20,9 30,8 40,11 50,12 60,10 70,13 80,15 90,14 100,16' },
    { label: 'Doanh thu',   value: '1,42', currency: 'tỷ ₫', trend: '+18.6%', trendDir: 'up',   tone: 'info', icon: <Icon.Dollar size={16} />, sparkColor: '#2563EB', sparkPath: '0,18 10,17 20,16 30,12 40,13 50,11 60,8 70,9 80,6 90,4 100,3' },
  ];

  const recents = [
    { partner: 'Pan Pacific Logistics', logo: 'PP', route: 'Hải Phòng → Bắc Ninh',     km: 92,  type: 'CONT 40', status: 'success', label: 'Đã khớp',  date: '22/04' },
    { partner: 'Maersk Line VN',        logo: 'ML', route: 'Lạch Huyện → Hà Nội',      km: 108, type: 'CONT 40', status: 'warning', label: 'Chờ xử lý', date: '22/04' },
    { partner: 'Hapag-Lloyd VN',        logo: 'HL', route: 'Hải Phòng → Hưng Yên',     km: 88,  type: 'CONT 20', status: 'brand',   label: 'Đang chạy', date: '21/04' },
    { partner: 'CMA CGM Việt Nam',      logo: 'CC', route: 'Đình Vũ → Hải Dương',      km: 72,  type: 'CONT 20', status: 'success', label: 'Đã khớp',  date: '21/04' },
    { partner: 'PIL Vietnam',           logo: 'PL', route: 'Hải Phòng → Hà Nam',       km: 95,  type: 'CONT 40', status: 'neutral', label: 'Đã huỷ',   date: '20/04' },
  ];

  const counts = [4,6,8,3,12,9,7,15,11,6,4,8,13,10,14,9,5,11,8,7,16,18,12,9,6,4,7,11,8,9];
  const max = Math.max(...counts);

  const audit = [
    { actor: 'Kế toán',    verb: 'tạo đơn hàng',    target: 'cho Pan Pacific', t: '14:32 · 22/04' },
    { actor: 'Hệ thống',   verb: 'tự động ghép chuyến', target: '5 chuyến mới', t: '14:31 · 22/04' },
    { actor: 'Kế toán',    verb: 'cập nhật khách hàng', target: 'Maersk Line VN', t: '13:18 · 22/04' },
    { actor: 'Kế toán',    verb: 'tạo phiếu chuyến', target: 'Hapag-Lloyd', t: '11:02 · 22/04' },
    { actor: 'Tài xế',     verb: 'xác nhận hoàn thành', target: 'Hải Phòng → Bắc Ninh', t: '10:48 · 22/04' },
  ];

  return (
    <>
      {role === 'taixe' ? (
        <div className="role-banner">
          <Icon.AlertCircle size={14} />
          <span>Bạn đang xem giao diện desktop. Trải nghiệm tài xế tối ưu trên điện thoại — xem UI kit <strong>ui_kits/mobile</strong>.</span>
        </div>
      ) : null}

      <div className="page-header">
        <div>
          <h1>Tổng quan</h1>
          <p>Dữ liệu {monthLabel}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-3)', borderRadius: 'var(--radius-md)', padding: 4 }}>
          <button className="btn btn-ghost btn-icon" style={{ height: 28, width: 28 }} aria-label="Tháng trước"><Icon.ChevronLeft size={14} /></button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px', fontSize: 13, fontWeight: 600 }}>
            <Icon.Calendar size={13} /><span>{monthLabel}</span>
          </div>
          <button className="btn btn-ghost btn-icon" style={{ height: 28, width: 28 }} aria-label="Tháng sau"><Icon.ChevronRight size={14} /></button>
        </div>
      </div>

      <div className="kpi-grid">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="main-grid">
        <div className="card-shell">
          <div className="card-header">
            <div>
              <h3>Lệnh vận chuyển gần đây</h3>
              <p>{recents.length} lệnh mới nhất</p>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--brand)' }}>
              Xem tất cả <Icon.ArrowUpRight size={12} />
            </button>
          </div>
          <div className="tt-list">
            {recents.map((r, i) => (
              <button key={i} className="tt-list-row" onClick={() => onOpenTrip?.(r)}>
                <div className="row-icon" style={{ background: 'var(--brand-soft)', color: 'var(--brand-hover)', fontSize: 12, fontWeight: 700 }}>{r.logo}</div>
                <div className="row-content">
                  <div className="row-headline">
                    <strong>{r.partner}</strong>
                    <span className={`badge badge-${r.status}`}><span className="dot"></span>{r.label}</span>
                  </div>
                  <div className="row-meta">{r.route} · {r.km} km</div>
                </div>
                <div className="row-tail">
                  <div className="tail-date">{r.date}</div>
                  <span className="tail-tag">{r.type}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="card-shell">
          <div className="card-header">
            <div>
              <h3>Biểu đồ chuyến đi</h3>
              <p>{monthLabel}</p>
            </div>
            <span className="badge badge-brand">
              <Icon.TrendingUp size={10} /> 412 chuyến
            </span>
          </div>
          <div className="chart-shell">
            <MonthBar counts={counts} max={max} />
          </div>
        </div>
      </div>

      <div className="card-shell">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon.Activity size={14} />
            <h3 style={{ margin: 0 }}>Hoạt động gần đây</h3>
          </div>
        </div>
        <div>
          {audit.map((a, i) => (
            <div key={i} className="activity-row">
              <div className="ar-icon"><Icon.User size={14} /></div>
              <div className="ar-text">
                <span className="ar-actor">{a.actor}</span> đã {a.verb} <span style={{ color: 'var(--fg-2)' }}>{a.target}</span>
              </div>
              <div className="ar-time">{a.t}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

Object.assign(window, { DashboardScreen });
