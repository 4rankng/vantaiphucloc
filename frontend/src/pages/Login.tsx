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
