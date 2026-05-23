import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { Reveal } from '@/components/shared/Reveal'
import { CargoConstellationsCanvas } from '@/components/shared/CargoConstellationsCanvas'

export function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const loggedInUser = await login(username, password)
      if (!loggedInUser) {
        setError('Thông tin đăng nhập không hợp lệ. Vui lòng thử lại.')
      } else {
        const roleRoutes: Record<string, string> = {
          driver: '/driver',
          accountant: '/accountant',
          director: '/director',
          superadmin: '/superadmin',
        }
        const from = (location.state as { from?: string } | null)?.from ?? localStorage.getItem('ttransport_redirect')
        localStorage.removeItem('ttransport_redirect')
        const defaultRoute = roleRoutes[loggedInUser.role] ?? '/driver'
        navigate(from ?? defaultRoute, { replace: true })
      }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 429) {
        setError('Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau.')
      } else {
        setError('Thông tin đăng nhập không hợp lệ. Vui lòng thử lại.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-[100dvh] w-full flex flex-col items-center justify-center relative overflow-hidden px-5"
      style={{ background: 'var(--theme-brand-gradient)' }}
    >
      {/* Background decorative shapes */}
      <div className="login-bg-circle login-bg-circle--tl" />
      <div className="login-bg-circle login-bg-circle--br" />
      <div className="login-bg-wave" />

      {/* Animated cargo constellation background */}
      <CargoConstellationsCanvas
        seed={888}
        nodeCount={11}
        particleCount={75}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 0, opacity: 0.38 }}
      />

      {/* ── Street & container truck illustration ── */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{ zIndex: 2 }}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 1440 170"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full"
          preserveAspectRatio="xMidYMax meet"
        >
          <defs>
            {/* Road shimmer: bright in the middle, fades at both edges */}
            <linearGradient id="login-road-shimmer-grd" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="white" stopOpacity="0"   />
              <stop offset="18%"  stopColor="white" stopOpacity="0.18" />
              <stop offset="82%"  stopColor="white" stopOpacity="0.18" />
              <stop offset="100%" stopColor="white" stopOpacity="0"   />
            </linearGradient>
          </defs>

          {/* ═══ ROAD ═══ */}
          <rect x="0" y="118" width="1440" height="52" fill="white" fillOpacity="0.07" />
          <rect x="0" y="118" width="1440" height="52" fill="url(#login-road-shimmer-grd)" />
          {/* Road top edge */}
          <line x1="0" y1="118" x2="1440" y2="118" stroke="white" strokeWidth="1.5" strokeOpacity="0.22" />
          {/* Road bottom edge */}
          <line x1="0" y1="168" x2="1440" y2="168" stroke="white" strokeWidth="1" strokeOpacity="0.1" />
          {/* Centre-line dashes — animated to scroll right (direction of travel) */}
          <line
            x1="-72" y1="143" x2="1512" y2="143"
            stroke="white" strokeWidth="2" strokeOpacity="0.2"
            strokeDasharray="42 30"
            className="login-street-dash"
          />

          {/* ═══ MAIN TRUCK — bottom-left, cab facing right ═══ */}
          <g className="login-truck-bounce">

            {/* ── Trailer / container body ── */}
            <rect x="28" y="22" width="282" height="78" rx="3" fill="white" fillOpacity="0.13" />
            {/* Top rail */}
            <rect x="28" y="22" width="282" height="5" rx="2" fill="white" fillOpacity="0.24" />
            {/* Bottom skirt */}
            <rect x="28" y="95" width="282" height="4" rx="1" fill="white" fillOpacity="0.18" />
            {/* Rear door frame (two vertical bars at rear edge) */}
            <rect x="28" y="22" width="7"   height="78" fill="white" fillOpacity="0.18" />
            <rect x="35" y="27" width="3"   height="68" fill="white" fillOpacity="0.08" />
            {/* Vertical rib dividers */}
            <line x1="112" y1="27" x2="112" y2="96" stroke="white" strokeWidth="1.5" strokeOpacity="0.09" />
            <line x1="196" y1="27" x2="196" y2="96" stroke="white" strokeWidth="1.5" strokeOpacity="0.09" />
            <line x1="258" y1="27" x2="258" y2="96" stroke="white" strokeWidth="1.5" strokeOpacity="0.07" />
            {/* Subtle corner locking boxes */}
            <rect x="36" y="26" width="9" height="9" rx="1" fill="white" fillOpacity="0.1" />
            <rect x="36" y="84" width="9" height="9" rx="1" fill="white" fillOpacity="0.1" />
            <rect x="299" y="26" width="9" height="9" rx="1" fill="white" fillOpacity="0.1" />
            <rect x="299" y="84" width="9" height="9" rx="1" fill="white" fillOpacity="0.1" />

            {/* Landing gear (two legs, with foot pads) */}
            <rect x="52" y="96" width="5"  height="14" rx="1" fill="white" fillOpacity="0.17" />
            <rect x="47" y="108" width="15" height="3" rx="1" fill="white" fillOpacity="0.13" />
            <rect x="64" y="96" width="5"  height="10" rx="1" fill="white" fillOpacity="0.12" />

            <rect x="238" y="96" width="5" height="8"  rx="1" fill="white" fillOpacity="0.14" />

            {/* Fifth-wheel coupling plate */}
            <rect x="295" y="94" width="22" height="6" rx="2" fill="white" fillOpacity="0.22" />

            {/* ── Cab unit ── */}
            {/* Main cab body */}
            <path
              d="M312 32 L386 32 Q396 32 397 44 L397 100 L312 100 Z"
              fill="white" fillOpacity="0.17"
            />
            {/* Aerodynamic roof fairing (bridges container top → cab) */}
            <path
              d="M310 20 L310 32 L386 32 Q394 32 396 40 L397 38
                 Q395 18 376 18 L310 18 Z"
              fill="white" fillOpacity="0.11"
            />
            {/* Side window */}
            <rect x="315" y="38" width="34" height="25" rx="3" fill="white" fillOpacity="0.11" />
            <line x1="318" y1="42" x2="332" y2="42" stroke="white" strokeWidth="1" strokeOpacity="0.22" />
            {/* A-pillar */}
            <line x1="350" y1="34" x2="354" y2="63" stroke="white" strokeWidth="2.5" strokeOpacity="0.14" />
            {/* Windshield */}
            <rect x="354" y="38" width="36" height="28" rx="3" fill="white" fillOpacity="0.09" />
            <line x1="357" y1="42" x2="372" y2="42" stroke="white" strokeWidth="1.2" strokeOpacity="0.24" />
            {/* Cab door split */}
            <line x1="351" y1="38" x2="351" y2="100" stroke="white" strokeWidth="1" strokeOpacity="0.1" />
            {/* Door handle */}
            <rect x="330" y="64" width="14" height="3" rx="1.5" fill="white" fillOpacity="0.2" />
            {/* Headlight stack */}
            <rect x="391" y="40" width="8" height="11" rx="2" fill="white" fillOpacity="0.3" />
            <rect x="391" y="55" width="8" height="9"  rx="2" fill="white" fillOpacity="0.2" />
            {/* Bumper / lower fascia */}
            <rect x="390" y="88" width="10" height="12" rx="2" fill="white" fillOpacity="0.22" />
            {/* Grille bars */}
            <g stroke="white" strokeWidth="1.2" strokeOpacity="0.18" strokeLinecap="round">
              <line x1="391" y1="68" x2="398" y2="68" />
              <line x1="391" y1="74" x2="398" y2="74" />
              <line x1="391" y1="80" x2="398" y2="80" />
              <line x1="391" y1="86" x2="398" y2="86" />
            </g>
            {/* Step / running board */}
            <rect x="313" y="94" width="52" height="6" rx="2" fill="white" fillOpacity="0.15" />
            {/* Exhaust stack */}
            <rect x="304" y="8"  width="6" height="30" rx="3" fill="white" fillOpacity="0.16" />
            <ellipse cx="307" cy="8" rx="4" ry="3"    fill="white" fillOpacity="0.1" />

            {/* ── Wheels (cy=100 so bottom=119, sits on road at y=118) ── */}

            {/* Trailer rear dual-axle — two wheels side by side */}
            <g className="login-wheel-spin">
              <circle cx="76"  cy="100" r="19" fill="white" fillOpacity="0.15" />
              <circle cx="76"  cy="100" r="12" fill="white" fillOpacity="0.06" />
              <circle cx="76"  cy="100" r="5"  fill="white" fillOpacity="0.2"  />
              <line x1="76" y1="81" x2="76"  y2="119" stroke="white" strokeWidth="1.2" strokeOpacity="0.11" />
              <line x1="57" y1="100" x2="95" y2="100" stroke="white" strokeWidth="1.2" strokeOpacity="0.11" />
              <line x1="63" y1="87" x2="89"  y2="113" stroke="white" strokeWidth="1" strokeOpacity="0.07" />
              <line x1="89" y1="87" x2="63"  y2="113" stroke="white" strokeWidth="1" strokeOpacity="0.07" />
            </g>
            <g className="login-wheel-spin">
              <circle cx="102" cy="100" r="19" fill="white" fillOpacity="0.15" />
              <circle cx="102" cy="100" r="12" fill="white" fillOpacity="0.06" />
              <circle cx="102" cy="100" r="5"  fill="white" fillOpacity="0.2"  />
              <line x1="102" y1="81"  x2="102" y2="119" stroke="white" strokeWidth="1.2" strokeOpacity="0.11" />
              <line x1="83"  y1="100" x2="121" y2="100" stroke="white" strokeWidth="1.2" strokeOpacity="0.11" />
            </g>
            {/* Axle spacer between dual wheels */}
            <rect x="93" y="98" width="12" height="4" rx="2" fill="white" fillOpacity="0.12" />

            {/* Trailer forward axle */}
            <g className="login-wheel-spin">
              <circle cx="248" cy="100" r="19" fill="white" fillOpacity="0.15" />
              <circle cx="248" cy="100" r="12" fill="white" fillOpacity="0.06" />
              <circle cx="248" cy="100" r="5"  fill="white" fillOpacity="0.2"  />
              <line x1="248" y1="81"  x2="248" y2="119" stroke="white" strokeWidth="1.2" strokeOpacity="0.11" />
              <line x1="229" y1="100" x2="267" y2="100" stroke="white" strokeWidth="1.2" strokeOpacity="0.11" />
              <line x1="235" y1="87"  x2="261" y2="113" stroke="white" strokeWidth="1" strokeOpacity="0.07" />
              <line x1="261" y1="87"  x2="235" y2="113" stroke="white" strokeWidth="1" strokeOpacity="0.07" />
            </g>

            {/* Cab rear drive axle */}
            <g className="login-wheel-spin">
              <circle cx="344" cy="100" r="19" fill="white" fillOpacity="0.15" />
              <circle cx="344" cy="100" r="12" fill="white" fillOpacity="0.06" />
              <circle cx="344" cy="100" r="5"  fill="white" fillOpacity="0.2"  />
              <line x1="344" y1="81"  x2="344" y2="119" stroke="white" strokeWidth="1.2" strokeOpacity="0.11" />
              <line x1="325" y1="100" x2="363" y2="100" stroke="white" strokeWidth="1.2" strokeOpacity="0.11" />
              <line x1="331" y1="87"  x2="357" y2="113" stroke="white" strokeWidth="1" strokeOpacity="0.07" />
              <line x1="357" y1="87"  x2="331" y2="113" stroke="white" strokeWidth="1" strokeOpacity="0.07" />
            </g>

            {/* Cab front steering axle (slightly smaller) */}
            <g className="login-wheel-spin">
              <circle cx="377" cy="100" r="17" fill="white" fillOpacity="0.15" />
              <circle cx="377" cy="100" r="10" fill="white" fillOpacity="0.06" />
              <circle cx="377" cy="100" r="4"  fill="white" fillOpacity="0.2"  />
              <line x1="377" y1="83"  x2="377" y2="117" stroke="white" strokeWidth="1.2" strokeOpacity="0.11" />
              <line x1="360" y1="100" x2="394" y2="100" stroke="white" strokeWidth="1.2" strokeOpacity="0.11" />
              <line x1="366" y1="88"  x2="388" y2="112" stroke="white" strokeWidth="1" strokeOpacity="0.07" />
              <line x1="388" y1="88"  x2="366" y2="112" stroke="white" strokeWidth="1" strokeOpacity="0.07" />
            </g>

            {/* Motion-blur lines trailing behind the trailer */}
            <g stroke="white" strokeLinecap="round">
              <line x1="4"  y1="52" x2="26" y2="52" strokeWidth="2.5" strokeOpacity="0.11" />
              <line x1="0"  y1="63" x2="26" y2="63" strokeWidth="2"   strokeOpacity="0.08" />
              <line x1="8"  y1="74" x2="26" y2="74" strokeWidth="1.5" strokeOpacity="0.06" />
              <line x1="4"  y1="85" x2="26" y2="85" strokeWidth="1"   strokeOpacity="0.04" />
            </g>
          </g>

          {/* ═══ DISTANT TRUCK — right side, creates road depth ═══ */}
          <g opacity="0.48">
            {/* Container */}
            <rect x="918" y="72" width="166" height="42" rx="2" fill="white" fillOpacity="0.1" />
            <rect x="918" y="72" width="166" height="3"  fill="white" fillOpacity="0.16" />
            <rect x="918" y="72" width="5"   height="42" fill="white" fillOpacity="0.14" />
            <line x1="984"  y1="75" x2="984"  y2="114" stroke="white" strokeWidth="1" strokeOpacity="0.08" />
            <line x1="1050" y1="75" x2="1050" y2="114" stroke="white" strokeWidth="1" strokeOpacity="0.08" />
            {/* Cab */}
            <path
              d="M1084 78 L1122 78 Q1130 78 1130 86 L1130 114 L1084 114 Z"
              fill="white" fillOpacity="0.12"
            />
            <rect x="1088" y="83" width="26" height="16" rx="1.5" fill="white" fillOpacity="0.08" />
            <rect x="1124" y="86" width="7"  height="18" rx="1"   fill="white" fillOpacity="0.14" />
            {/* Wheels */}
            <circle cx="946"  cy="114" r="11" fill="white" fillOpacity="0.11" />
            <circle cx="966"  cy="114" r="11" fill="white" fillOpacity="0.11" />
            <circle cx="1058" cy="114" r="11" fill="white" fillOpacity="0.11" />
            <circle cx="1116" cy="114" r="10" fill="white" fillOpacity="0.11" />
          </g>
        </svg>
      </div>

      {/* Single self-contained card (reveals on viewport entry) */}
      <Reveal distance={16} delay={80}>
        <div className="login-card animate-fade-slide-up">

          {/* ── Green header band ── */}
          <div className="login-card-hero">
            <div className="login-logo-wrap">
              <img src="/logo.avif" alt="TTransport" className="login-logo" />
            </div>
            <div className="login-brand-text">
              <h1 className="login-brand-name">TTransport</h1>
              <p className="login-brand-tagline">Quản lý vận tải hàng hóa</p>
            </div>
          </div>

          {/* ── White form body ── */}
          <div className="login-card-body">
            <div className="login-card-header">
              <h2 className="login-card-title">Đăng nhập</h2>
              <p className="login-card-subtitle">Nhập thông tin để tiếp tục</p>
            </div>

            {error && (
              <div className="login-error">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form" noValidate>
              <div className="login-field">
                <label className="login-label">
                  Số điện thoại / Email / Tên đăng nhập
                </label>
                <div className="relative">
                  <User className="login-field-icon" style={{ color: 'var(--theme-text-muted)' }} />
                  <Input
                    type="text"
                    placeholder="SĐT, email hoặc tên đăng nhập"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="login-input"
                    autoComplete="username"
                    autoCapitalize="none"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="login-field">
                <label className="login-label">Mật khẩu</label>
                <div className="relative">
                  <Lock className="login-field-icon" style={{ color: 'var(--theme-text-muted)' }} />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="login-input"
                    style={{ paddingRight: '3rem' }}
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    className="login-eye-btn"
                    style={{ color: 'var(--theme-text-muted)' }}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="login-submit-btn"
                style={{
                  background: 'var(--theme-brand-primary)',
                  color: 'var(--theme-text-on-brand)',
                }}
                disabled={loading || !username.trim() || !password.trim()}
              >
                {loading ? (
                  <span className="login-loading">
                    <span className="login-spinner" />
                    Đang đăng nhập...
                  </span>
                ) : (
                  'Đăng nhập'
                )}
              </Button>
            </form>
          </div>
        </div>
      </Reveal>

      {/* Footer */}
      <p className="login-footer animate-fade-slide-up stagger-2">
        © {new Date().getFullYear()} TTransport
      </p>
    </div>
  )
}
