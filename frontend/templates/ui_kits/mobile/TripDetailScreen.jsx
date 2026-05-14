/* eslint-disable */
// TripDetailScreen — view of one trip from the driver's perspective.
// Plate-first; no internal WO codes shown to driver.

function TripDetailScreen({ data, onBack, onComplete }) {
  const d = data || {
    plate: '15C-12345',
    from: 'Cảng Lạch Huyện', to: 'Phố Nối',
    date: '22/04/2026', container: 'MSKU-203912-1', client: 'Maersk Line VN',
    salary: '950.000 ₫', km: 108, status: 'MATCHED',
    trailerType: 'CONT 40',
    pickup: 'Cảng Lạch Huyện — Cát Hải, Hải Phòng',
    dropoff: 'KCN Phố Nối — Văn Lâm, Hưng Yên',
    startTime: '06:42', endTime: '10:54',
    notes: 'Container đã niêm phong tại cổng cảng, niêm chì #SN-7821',
  };

  return (
    <div className="m-app">
      <header className="detail-header">
        <button className="back" onClick={onBack} aria-label="Quay lại"><Icon.ChevronLeft /></button>
        <h1>Chi tiết chuyến</h1>
        <button style={{ background:'transparent', border:'none', width:40, height:40, color:'var(--fg-2)' }} aria-label="Tuỳ chọn">⋯</button>
      </header>

      <div className="m-body" style={{ paddingTop: 0, paddingBottom: 24 }}>
        <div className="detail-banner">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, letterSpacing: '0.02em' }}>{d.plate}</span>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: 'rgba(255,255,255,0.18)', color: '#fff' }}>{d.trailerType}</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>
            {d.from} <span style={{ opacity: 0.6 }}>→</span> {d.to}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.78)', marginTop: 4 }}>{d.date} · {d.km} km · {d.client}</div>
        </div>

        <div className="detail-grid">
          <div className="detail-tile" style={{ gridColumn: '1 / -1' }}>
            <div className="l">Điểm xếp</div>
            <div className="v" style={{ fontSize: 13 }}>{d.pickup}</div>
          </div>
          <div className="detail-tile" style={{ gridColumn: '1 / -1' }}>
            <div className="l">Điểm dỡ</div>
            <div className="v" style={{ fontSize: 13 }}>{d.dropoff}</div>
          </div>
          <div className="detail-tile">
            <div className="l">Số container</div>
            <div className="v mono" style={{ fontSize: 13 }}>{d.container}</div>
          </div>
          <div className="detail-tile">
            <div className="l">Bắt đầu — Kết thúc</div>
            <div className="v" style={{ fontSize: 13 }}>{d.startTime} → {d.endTime}</div>
          </div>
          <div className="detail-tile" style={{ gridColumn: '1 / -1' }}>
            <div className="l">Lương sản lượng</div>
            <div className="v" style={{ color: 'var(--brand)', fontSize: 22, fontFamily: 'var(--font-mono)' }}>{d.salary}</div>
          </div>
          <div className="detail-tile" style={{ gridColumn: '1 / -1' }}>
            <div className="l">Ghi chú</div>
            <div className="v" style={{ fontSize: 13, fontWeight: 400, color: 'var(--fg-2)', lineHeight: 1.45 }}>{d.notes}</div>
          </div>
        </div>

        <div className="action-row" style={{ marginTop: 14 }}>
          <button className="btn btn-outline" onClick={onBack}>Sửa phiếu</button>
          <button className="btn btn-primary" onClick={onComplete}>
            <Icon.CheckCircle size={16} /> Hoàn thành
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { TripDetailScreen });
