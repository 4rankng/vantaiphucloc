import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { Reveal } from '@/components/shared/Reveal'

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

      {/* Scenic background SVG illustration */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{ zIndex: 0 }}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 480 320"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute bottom-0 left-0 w-full"
          style={{ opacity: 0.18 }}
          preserveAspectRatio="xMidYMax meet"
        >
          <defs>
            <linearGradient id="lg-road-bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0"/>
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.25"/>
            </linearGradient>
          </defs>
          {/* Stars / dots in sky */}
          <circle cx="40"  cy="30"  r="1.5" fill="#FFFFFF" opacity="0.7"/>
          <circle cx="120" cy="14"  r="1"   fill="#FFFFFF" opacity="0.6"/>
          <circle cx="200" cy="22"  r="2"   fill="#FFFFFF" opacity="0.8"/>
          <circle cx="300" cy="10"  r="1.5" fill="#FFFFFF" opacity="0.5"/>
          <circle cx="380" cy="28"  r="1"   fill="#FFFFFF" opacity="0.65"/>
          <circle cx="440" cy="16"  r="1.5" fill="#FFFFFF" opacity="0.7"/>
          <circle cx="80"  cy="54"  r="1"   fill="#FFFFFF" opacity="0.45"/>
          <circle cx="260" cy="38"  r="1.2" fill="#FFFFFF" opacity="0.55"/>
          <circle cx="420" cy="50"  r="1"   fill="#FFFFFF" opacity="0.5"/>
          {/* Horizon distant hills */}
          <path d="M0 200 Q80 160 160 180 Q240 200 320 165 Q400 130 480 170 L480 320 L0 320 Z"
                fill="#FFFFFF" fillOpacity="0.05"/>
          {/* Ground road surface */}
          <rect x="0" y="260" width="480" height="60" fill="#FFFFFF" fillOpacity="0.07"/>
          {/* Road center dashes */}
          <g stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.3">
            <line x1="0"   y1="290" x2="40"  y2="290"/>
            <line x1="70"  y1="290" x2="110" y2="290"/>
            <line x1="140" y1="290" x2="180" y2="290"/>
            <line x1="210" y1="290" x2="250" y2="290"/>
            <line x1="280" y1="290" x2="320" y2="290"/>
            <line x1="350" y1="290" x2="390" y2="290"/>
            <line x1="420" y1="290" x2="460" y2="290"/>
          </g>
          {/* Truck 1 (left, larger) */}
          <g transform="translate(40 245)">
            {/* Cargo */}
            <rect x="0"  y="0"  width="100" height="46" rx="4" fill="#FFFFFF" fillOpacity="0.15"/>
            <rect x="0"  y="0"  width="100" height="5"  rx="2" fill="#FFFFFF" fillOpacity="0.2"/>
            {/* Cab */}
            <path d="M100 8 L128 8 Q134 8 134 14 L134 46 L100 46 Z" fill="#FFFFFF" fillOpacity="0.22"/>
            <rect x="103" y="12" width="27" height="18" rx="2" fill="#FFFFFF" fillOpacity="0.15"/>
            {/* Wheels */}
            <circle cx="20"  cy="50" r="9" fill="#FFFFFF" fillOpacity="0.25"/>
            <circle cx="20"  cy="50" r="4" fill="#FFFFFF" fillOpacity="0.15"/>
            <circle cx="112" cy="50" r="9" fill="#FFFFFF" fillOpacity="0.25"/>
            <circle cx="112" cy="50" r="4" fill="#FFFFFF" fillOpacity="0.15"/>
          </g>
          {/* Truck 2 (right, smaller / distant) */}
          <g transform="translate(310 254)" opacity="0.65">
            <rect x="0"  y="0"  width="72" height="32" rx="3" fill="#FFFFFF" fillOpacity="0.12"/>
            <path d="M72 6 L92 6 Q96 6 96 10 L96 32 L72 32 Z" fill="#FFFFFF" fillOpacity="0.18"/>
            <rect x="74" y="9" width="18" height="12" rx="1.5" fill="#FFFFFF" fillOpacity="0.12"/>
            <circle cx="15" cy="36" r="6" fill="#FFFFFF" fillOpacity="0.2"/>
            <circle cx="82" cy="36" r="6" fill="#FFFFFF" fillOpacity="0.2"/>
          </g>
          {/* Motion lines behind truck 1 */}
          <g stroke="#FFFFFF" strokeLinecap="round" strokeOpacity="0.15">
            <line x1="0"  y1="262" x2="28" y2="262" strokeWidth="2.5"/>
            <line x1="0"  y1="270" x2="22" y2="270" strokeWidth="1.8"/>
            <line x1="0"  y1="278" x2="18" y2="278" strokeWidth="1.2"/>
          </g>
          {/* Distant building silhouettes */}
          <g fill="#FFFFFF" fillOpacity="0.07">
            <rect x="168" y="200" width="20" height="60"/>
            <rect x="192" y="218" width="16" height="42"/>
            <rect x="210" y="208" width="24" height="52"/>
            <rect x="236" y="222" width="14" height="38"/>
            <rect x="254" y="196" width="18" height="64"/>
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
