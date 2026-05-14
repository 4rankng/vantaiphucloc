/* eslint-disable */
// LoginScreen — full-bleed emerald hero with scenic SVG road, single white card.

function LoginScreen({ onLogin }) {
  const [username, setUsername] = React.useState('ketoan');
  const [password, setPassword] = React.useState('admin123');
  const [showPw, setShowPw] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (!username || !password) return;
    setSubmitting(true);
    setTimeout(() => onLogin?.(username), 380);
  };

  return (
    <div className="login-page">
      <div className="login-decor" aria-hidden="true">
        <svg viewBox="0 0 480 320" preserveAspectRatio="xMidYMax meet">
          <circle cx="40" cy="30" r="1.5" fill="#fff" opacity="0.7"/>
          <circle cx="120" cy="14" r="1" fill="#fff" opacity="0.6"/>
          <circle cx="200" cy="22" r="2" fill="#fff" opacity="0.8"/>
          <circle cx="300" cy="10" r="1.5" fill="#fff" opacity="0.5"/>
          <circle cx="380" cy="28" r="1" fill="#fff" opacity="0.65"/>
          <circle cx="440" cy="16" r="1.5" fill="#fff" opacity="0.7"/>
          <path d="M0 200 Q80 160 160 180 Q240 200 320 165 Q400 130 480 170 L480 320 L0 320 Z" fill="#fff" fillOpacity="0.05"/>
          <rect x="0" y="260" width="480" height="60" fill="#fff" fillOpacity="0.07"/>
          <g stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.3">
            <line x1="0" y1="290" x2="40" y2="290"/>
            <line x1="70" y1="290" x2="110" y2="290"/>
            <line x1="140" y1="290" x2="180" y2="290"/>
            <line x1="210" y1="290" x2="250" y2="290"/>
            <line x1="280" y1="290" x2="320" y2="290"/>
            <line x1="350" y1="290" x2="390" y2="290"/>
            <line x1="420" y1="290" x2="460" y2="290"/>
          </g>
          <g transform="translate(40 245)">
            <rect x="0" y="0" width="100" height="46" rx="4" fill="#fff" fillOpacity="0.15"/>
            <rect x="0" y="0" width="100" height="5" rx="2" fill="#fff" fillOpacity="0.2"/>
            <path d="M100 8 L128 8 Q134 8 134 14 L134 46 L100 46 Z" fill="#fff" fillOpacity="0.22"/>
            <rect x="103" y="12" width="27" height="18" rx="2" fill="#fff" fillOpacity="0.15"/>
            <circle cx="20" cy="50" r="9" fill="#fff" fillOpacity="0.25"/>
            <circle cx="20" cy="50" r="4" fill="#fff" fillOpacity="0.15"/>
            <circle cx="112" cy="50" r="9" fill="#fff" fillOpacity="0.25"/>
            <circle cx="112" cy="50" r="4" fill="#fff" fillOpacity="0.15"/>
          </g>
          <g transform="translate(310 254)" opacity="0.65">
            <rect x="0" y="0" width="72" height="32" rx="3" fill="#fff" fillOpacity="0.12"/>
            <path d="M72 6 L92 6 Q96 6 96 10 L96 32 L72 32 Z" fill="#fff" fillOpacity="0.18"/>
            <circle cx="15" cy="36" r="6" fill="#fff" fillOpacity="0.2"/>
            <circle cx="82" cy="36" r="6" fill="#fff" fillOpacity="0.2"/>
          </g>
          <g fill="#fff" fillOpacity="0.07">
            <rect x="168" y="200" width="20" height="60"/>
            <rect x="192" y="218" width="16" height="42"/>
            <rect x="210" y="208" width="24" height="52"/>
            <rect x="236" y="222" width="14" height="38"/>
            <rect x="254" y="196" width="18" height="64"/>
          </g>
        </svg>
      </div>

      <div className="login-card fade-up">
        <div className="login-hero">
          <div className="logo"><img src="../../assets/logo-512.png" alt="" /></div>
          <div>
            <h1>TTransport</h1>
            <p>Quản lý vận tải hàng hóa</p>
          </div>
        </div>
        <form className="login-body" onSubmit={submit}>
          <h2>Đăng nhập</h2>
          <p className="sub">Nhập thông tin để tiếp tục</p>

          <div className="field">
            <label>Số điện thoại / Email / Tên đăng nhập</label>
            <div className="input-icon">
              <Icon.User />
              <input
                className="input"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="SĐT, email hoặc tên đăng nhập"
                autoCapitalize="none"
              />
            </div>
          </div>

          <div className="field">
            <label>Mật khẩu</label>
            <div className="input-icon" style={{ position: 'relative' }}>
              <Icon.Lock />
              <input
                className="input"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                style={{
                  position: 'absolute', right: 10, top: '50%',
                  transform: 'translateY(-50%)', background: 'transparent',
                  border: 'none', padding: 4, color: 'var(--fg-3)', cursor: 'pointer',
                }}
              >
                <Icon.Eye size={16} />
              </button>
            </div>
            <div className="field-help">Tài khoản demo: <span style={{ fontFamily:'var(--font-mono)', color:'var(--fg-2)' }}>ketoan / admin123</span></div>
          </div>

          <button
            className="btn btn-primary btn-lg login-submit"
            type="submit"
            disabled={!username || !password || submitting}
          >
            {submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>
      </div>

      <p className="login-footer">© {new Date().getFullYear()} TTransport · Phúc Lộc Transport, Hải Phòng</p>
    </div>
  );
}

Object.assign(window, { LoginScreen });
