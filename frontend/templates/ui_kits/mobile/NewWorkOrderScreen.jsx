/* eslint-disable */
// NewWorkOrderScreen — driver camera capture + form for a new trip.

function NewWorkOrderScreen({ onBack, onSubmit }) {
  const [stage, setStage] = React.useState('camera'); // camera → form
  const [captured, setCaptured] = React.useState(false);
  const [route, setRoute] = React.useState('Cảng Tân Vũ → KCN Quế Võ');

  const onCapture = () => {
    setCaptured(true);
    setTimeout(() => setStage('form'), 350);
  };

  return (
    <div className="m-app">
      <header className="detail-header">
        <button className="back" onClick={onBack} aria-label="Quay lại"><Icon.ChevronLeft /></button>
        <h1>{stage === 'camera' ? 'Chụp số container' : 'Tạo chuyến mới'}</h1>
      </header>

      {stage === 'camera' ? (
        <div className="m-body" style={{ paddingTop: 0 }}>
          <div className="camera-shell">
            <div className="label"><span className="dot"></span>AI đang nhận diện</div>
            <div className="frame" style={{ position: 'relative' }}>
              <span className="corner" style={{ top: -2, left: -2, borderRight: 'none', borderBottom: 'none' }} />
              <span className="corner" style={{ top: -2, right: -2, borderLeft: 'none', borderBottom: 'none' }} />
              <span className="corner" style={{ bottom: -2, left: -2, borderRight: 'none', borderTop: 'none' }} />
              <span className="corner" style={{ bottom: -2, right: -2, borderLeft: 'none', borderTop: 'none' }} />
              <span>
                {captured
                  ? 'Đã nhận diện: CXDU-481523-7'
                  : 'Đưa số container vào trong khung'}
              </span>
            </div>
            <button className="capture-btn" onClick={onCapture} aria-label="Chụp"></button>
          </div>

          <div style={{ padding: '16px 4px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 13, color: 'var(--fg-2)', margin: 0, lineHeight: 1.5 }}>
              Chụp ảnh số container — AI sẽ tự nhận diện và điền vào phiếu. Vị trí GPS và thời gian được ghi nhận tự động.
            </p>
            <button className="btn btn-outline" onClick={() => setStage('form')}>
              Bỏ qua, nhập thủ công
            </button>
          </div>
        </div>
      ) : (
        <div className="m-body" style={{ paddingTop: 16 }}>
          <div className="ocr-result">
            <div className="ok"><Icon.CheckCircle /></div>
            <div className="text">
              <div className="l">Số container nhận diện được</div>
              <div className="v">CXDU-481523-7</div>
            </div>
          </div>

          <div className="field-m">
            <label>Tuyến đường</label>
            <input className="input" value={route} onChange={e => setRoute(e.target.value)} />
            <div className="suggest-chips">
              <button className="suggest-chip" type="button">Cảng Tân Vũ → Quế Võ</button>
              <button className="suggest-chip" type="button">Lạch Huyện → Phố Nối</button>
              <button className="suggest-chip" type="button">Đình Vũ → Hải Dương</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className="field-m">
              <label>Loại rơ-moóc</label>
              <input className="input" defaultValue="CONT 40" />
            </div>
            <div className="field-m">
              <label>Khối lượng (tấn)</label>
              <input className="input" defaultValue="22.4" />
            </div>
          </div>

          <div className="field-m">
            <label>Khách hàng</label>
            <input className="input" defaultValue="Pan Pacific Logistics" />
          </div>

          <div className="field-m">
            <label>Ghi chú</label>
            <input className="input" placeholder="Tuỳ chọn — niêm chì, hư hỏng…" />
          </div>

          <div style={{ background: 'var(--brand-soft)', border: '1px solid color-mix(in srgb, var(--brand) 22%, transparent)', borderRadius: 'var(--radius-md)', padding: 12, display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
            <div style={{ color: 'var(--brand)', flexShrink: 0, marginTop: 1 }}><Icon.AlertCircle size={16} /></div>
            <div style={{ fontSize: 12, color: 'var(--brand-hover)', lineHeight: 1.45 }}>
              GPS: 20.857°N 106.703°E · Hải Phòng &nbsp;·&nbsp; {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          <div className="action-row">
            <button className="btn btn-outline" onClick={onBack}>Huỷ</button>
            <button className="btn btn-primary" onClick={() => onSubmit?.(route)}>Lưu phiếu</button>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { NewWorkOrderScreen });
