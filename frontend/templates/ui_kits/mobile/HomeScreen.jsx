/* eslint-disable */
// HomeScreen — driver home.
// Earnings + period card → trip list → FAB.
// No bottom nav: driver only has one home view + create flow.

function PeriodNav({ label, sub, onPrev, onNext }) {
  return (
    <div className="period">
      <button className="arrow" onClick={onPrev} aria-label="Trước"><Icon.ChevronLeft size={14} /></button>
      <div className="label">{label}<small>{sub}</small></div>
      <button className="arrow" onClick={onNext} aria-label="Sau"><Icon.ChevronRight size={14} /></button>
    </div>
  );
}

function EarningsCard({ amount, count, onPrev, onNext, periodLabel, periodSub }) {
  return (
    <div className="earnings-card">
      <svg className="truck-wm" viewBox="0 0 120 60" aria-hidden="true">
        <rect x="0" y="10" width="72" height="35" rx="3" fill="#059669"/>
        <path d="M72 14 L92 14 Q96 14 96 18 L96 45 L72 45 Z" fill="#059669"/>
        <circle cx="18" cy="48" r="8" fill="#059669"/>
        <circle cx="82" cy="48" r="8" fill="#059669"/>
      </svg>
      <div className="col">
        <PeriodNav label={periodLabel} sub={periodSub} onPrev={onPrev} onNext={onNext} />
      </div>
      <div className="divider"></div>
      <div className="col">
        <div className="money-row">
          <img src="../../assets/icons/money.png" alt="" />
          <div>
            <div className="money-amt">{amount}</div>
            <div className="money-sub">{count} chuyến</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChuyenDaDiCard({ data, onClick }) {
  const tone = {
    PENDING:   { tag: 'Chờ ghép',  cls: 'warning' },
    MATCHED:   { tag: 'Đã khớp',   cls: 'success' },
    COMPLETED: { tag: 'Hoàn thành', cls: 'success' },
  }[data.status] || { tag: data.status, cls: 'neutral' };

  const toneStyle = {
    warning: { bg: 'var(--warning-soft)', fg: 'var(--warning-text)' },
    success: { bg: 'var(--success-soft)', fg: 'var(--success-text)' },
    neutral: { bg: '#F1F5F9', fg: '#334155' },
  }[tone.cls];

  return (
    <button className="wo-card" onClick={onClick}>
      <div className="top">
        <span className="plate">
          <span className="plate-flag"></span>
          {data.plate}
        </span>
        <span style={{
          display:'inline-flex', alignItems:'center', gap: 5,
          padding: '2px 9px', height: 20, fontSize: 11, fontWeight: 600, borderRadius: 999,
          whiteSpace: 'nowrap',
          background: toneStyle.bg, color: toneStyle.fg,
          lineHeight: 1,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }}></span>
          {tone.tag}
        </span>
      </div>
      <div className="route">
        <span>{data.from}</span>
        <span className="arrow">→</span>
        <span>{data.to}</span>
      </div>
      <div className="meta">
        <div className="left">
          <span>{data.date}</span>
          <span style={{ color: 'var(--fg-3)' }}>·</span>
          <span>{data.km} km</span>
        </div>
        <span className="amt">{data.salary}</span>
      </div>
    </button>
  );
}

function HomeScreen({ onOpenTrip, onCreate }) {
  const [filter, setFilter] = React.useState('all');
  const [periodIdx, setPeriodIdx] = React.useState(0);

  const periods = [
    { label: 'T4 · 2026',  sub: '01/04 – 30/04' },
    { label: 'T3 · 2026',  sub: '01/03 – 31/03' },
  ];
  const period = periods[periodIdx] || periods[0];

  // Driver typically drives a single rig — but the same driver may rotate across 2 plates.
  // Plate format: <province>C-<5 digits>. Hải Phòng = 15. C = truck.
  const trips = [
    { plate: '15C-12345', from: 'Cảng Tân Vũ',   to: 'KCN Quế Võ',    date: '22/04',   km: 92,  client: 'Pan Pacific', salary: '780.000 ₫',  status: 'PENDING' },
    { plate: '15C-12345', from: 'Cảng Lạch Huyện', to: 'Phố Nối',     date: '22/04',   km: 108, client: 'Maersk Line', salary: '950.000 ₫',  status: 'MATCHED' },
    { plate: '15C-12345', from: 'Hải Phòng',     to: 'Quế Võ',         date: '21/04',   km: 88,  client: 'Hapag-Lloyd', salary: '720.000 ₫',  status: 'MATCHED' },
    { plate: '15C-87104', from: 'Đình Vũ',       to: 'Hải Dương',      date: '21/04',   km: 72,  client: 'CMA CGM',     salary: '640.000 ₫',  status: 'MATCHED' },
    { plate: '15C-12345', from: 'Cảng Tân Vũ',   to: 'Yên Phong',      date: '20/04',   km: 96,  client: 'Evergreen',   salary: '820.000 ₫',  status: 'MATCHED' },
    { plate: '15C-12345', from: 'Hải Phòng',     to: 'Tiên Du',        date: '19/04',   km: 89,  client: 'ONE VN',      salary: '760.000 ₫',  status: 'COMPLETED' },
  ];

  const filtered = filter === 'pending' ? trips.filter(o => o.status === 'PENDING') : trips;

  return (
    <div className="m-app">
      <header className="m-header">
        <h1>Trang chủ</h1>
        <div className="right">
          <button style={{ background: 'transparent', border: 'none', padding: 6, color: 'var(--fg-2)' }} aria-label="Thông báo">
            <Icon.Bell size={20} />
          </button>
          <div className="avatar" style={{ background: 'var(--bg-3)', color: 'var(--fg-2)' }}>
            <Icon.User size={16} />
          </div>
        </div>
      </header>

      <div className="m-body no-fab" style={{ paddingBottom: 100 }}>
        <EarningsCard
          amount="4.870.000 ₫"
          count={6}
          periodLabel={period.label}
          periodSub={period.sub}
          onPrev={() => setPeriodIdx(i => Math.min(i + 1, periods.length - 1))}
          onNext={() => setPeriodIdx(i => Math.max(i - 1, 0))}
        />

        <div className="section-row" style={{ marginTop: 6 }}>
          <h2>Chuyến đã đi</h2>
          <div className="tab-pills">
            <button className={filter === 'all'     ? 'active' : ''} onClick={() => setFilter('all')}>Tất cả</button>
            <button className={filter === 'pending' ? 'active' : ''} onClick={() => setFilter('pending')}>Chờ ghép</button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-pane">
            <img src="../../assets/icons/calkey.png" alt="" />
            <h3>Chưa có chuyến nào</h3>
            <p>Nhấn + để tạo chuyến mới</p>
          </div>
        ) : (
          filtered.map((o, i) => <ChuyenDaDiCard key={i} data={o} onClick={() => onOpenTrip?.(o)} />)
        )}
      </div>

      <button className="fab" onClick={onCreate} aria-label="Tạo chuyến">
        <Icon.Plus size={24} />
      </button>
    </div>
  );
}

Object.assign(window, { HomeScreen });
