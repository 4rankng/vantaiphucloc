/* eslint-disable */
// DriverApp — root: in-frame state machine for Home → Detail → New work-order.

function PhoneFrame({ children, label }) {
  return (
    <div className="canvas-label">
      <h4>{label}</h4>
      <div style={{
        width: 380, height: 780,
        background: '#1a1a1c',
        borderRadius: 38,
        padding: 8,
        boxShadow: '0 30px 80px -20px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.4)',
      }}>
        <div style={{
          width: '100%', height: '100%',
          background: 'var(--bg-1)',
          borderRadius: 30,
          overflow: 'hidden',
          position: 'relative',
        }}>
          {/* status bar */}
          <div style={{
            height: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 22px',
            fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--fg-1)',
            background: 'var(--bg-2)',
            borderBottom: '1px solid var(--border-2)',
          }}>
            <span>9:30</span>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ display: 'inline-block', width: 14, height: 9, border: '1.5px solid currentColor', borderRadius: 2, position: 'relative' }}>
                <span style={{ position: 'absolute', inset: 1, background: 'currentColor', borderRadius: 1 }}></span>
              </span>
            </span>
          </div>
          {/* content */}
          <div style={{ position: 'absolute', inset: '32px 0 0', overflow: 'auto' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function DriverApp() {
  const [screen, setScreen] = React.useState('home');
  const [trip, setTrip] = React.useState(null);

  let body;
  switch (screen) {
    case 'home':
      body = <HomeScreen
        onOpenTrip={t => { setTrip(t); setScreen('detail'); }}
        onCreate={() => setScreen('new')}
      />;
      break;
    case 'detail':
      body = <TripDetailScreen data={trip} onBack={() => setScreen('home')} onComplete={() => setScreen('home')} />;
      break;
    case 'new':
      body = <NewWorkOrderScreen onBack={() => setScreen('home')} onSubmit={() => setScreen('home')} />;
      break;
    default:
      body = null;
  }

  return (
    <div className="canvas">
      <PhoneFrame label="Đang xem">{body}</PhoneFrame>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<DriverApp />);
