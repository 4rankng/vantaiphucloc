/* eslint-disable */
// App — root: auth gate + sidebar shell + page routing.

const NAV = [
  { key: 'dashboard', label: 'Tổng quan',         icon: Icon.Home },
  { key: 'trips',     label: 'Lệnh vận chuyển',   icon: Icon.Truck,   count: '412' },
  { key: 'workOrders',label: 'Phiếu chuyến',      icon: Icon.Layers,  count: '58' },
  { key: 'matching',  label: 'Ghép chuyến',       icon: Icon.Map },
  { key: 'clients',   label: 'Khách hàng',        icon: Icon.Users },
  { key: 'pricing',   label: 'Bảng giá',          icon: Icon.Tag,     section: 'admin' },
  { key: 'routes',    label: 'Cung đường',        icon: Icon.Map,     section: 'admin' },
  { key: 'reports',   label: 'Báo cáo & đối soát', icon: Icon.Receipt, section: 'admin' },
  { key: 'audit',     label: 'Nhật ký hoạt động',  icon: Icon.Activity,section: 'admin' },
  { key: 'settings',  label: 'Thiết lập',          icon: Icon.Settings,section: 'admin' },
];

const ROLE_META = {
  ketoan:    { label: 'Kế toán',  initial: 'K' },
  giamdoc:   { label: 'Giám đốc', initial: 'G' },
  admin:     { label: 'Quản trị', initial: 'Q' },
  taixe:     { label: 'Tài xế',   initial: 'T' },
};

function PlaceholderScreen({ title, hint, illustration = '../../assets/illustrations/empty-welcome.svg' }) {
  return (
    <>
      <div className="page-header fade-up">
        <div>
          <h1>{title}</h1>
          <p>{hint}</p>
        </div>
      </div>
      <div className="card-shell fade-up-2" style={{ padding: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <img src={illustration} alt="" style={{ width: 180, height: 'auto' }} />
        <div style={{ fontWeight: 600 }}>Màn hình này chưa được triển khai trong UI kit</div>
        <div style={{ fontSize: 13, color: 'var(--fg-3)' }}>Tham khảo Tổng quan, Lệnh vận chuyển hoặc Khách hàng để xem các mẫu thiết kế đầy đủ.</div>
      </div>
    </>
  );
}

function App() {
  const [authed, setAuthed] = React.useState(false);
  const [role, setRole] = React.useState('ketoan');
  const [page, setPage] = React.useState('dashboard');

  if (!authed) {
    return <LoginScreen onLogin={(uname) => {
      const r = ROLE_META[uname] ? uname : 'ketoan';
      setRole(r);
      setAuthed(true);
    }} />;
  }

  const titleMap = {
    dashboard: 'Tổng quan',
    trips: 'Lệnh vận chuyển',
    workOrders: 'Phiếu chuyến',
    matching: 'Ghép chuyến',
    clients: 'Khách hàng',
    pricing: 'Bảng giá',
    routes: 'Cung đường',
    reports: 'Báo cáo & đối soát',
    audit: 'Nhật ký hoạt động',
    settings: 'Thiết lập',
  };

  let body;
  switch (page) {
    case 'dashboard':
      body = <DashboardScreen role={role} onOpenTrip={() => setPage('trips')} />;
      break;
    case 'trips':
      body = <TripsScreen onOpenTrip={() => {}} />;
      break;
    case 'clients':
      body = <ClientsScreen onOpenClient={() => {}} />;
      break;
    case 'workOrders':
      body = <PlaceholderScreen title="Phiếu chuyến" hint="Phiếu nộp bởi tài xế · chờ ghép với lệnh vận chuyển" illustration="../../assets/illustrations/empty-matching.svg" />;
      break;
    case 'matching':
      body = <PlaceholderScreen title="Ghép chuyến" hint="Ghép thủ công hoặc tự động bằng AI" illustration="../../assets/illustrations/empty-matching.svg" />;
      break;
    case 'pricing':
      body = <PlaceholderScreen title="Bảng giá" hint="Quản lý bảng giá theo khách hàng và cung đường" illustration="../../assets/illustrations/empty-pricing.svg" />;
      break;
    case 'routes':
      body = <PlaceholderScreen title="Cung đường" hint="Danh sách điểm xếp – điểm dỡ" illustration="../../assets/illustrations/empty-routes.svg" />;
      break;
    case 'reports':
      body = <PlaceholderScreen title="Báo cáo & đối soát" hint="Doanh thu, công nợ, đối soát theo khách hàng" illustration="../../assets/illustrations/empty-pricing.svg" />;
      break;
    default:
      body = <PlaceholderScreen title={titleMap[page] || page} hint="" />;
  }

  return (
    <div className="app">
      <Sidebar
        items={NAV}
        activeKey={page}
        onNavigate={setPage}
        role={ROLE_META[role].label}
        initial={ROLE_META[role].initial}
      />
      <div className="app-main">
        <TopBar title={titleMap[page] || page} crumb={page === 'dashboard' ? 'Tháng 4, 2026' : null} role={ROLE_META[role].label} />
        <main className="app-body">{body}</main>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
