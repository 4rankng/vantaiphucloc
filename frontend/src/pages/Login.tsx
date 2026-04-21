import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import { Label } from '@/components/ui/Label/Label'
import { Truck, Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react'

export function Login() {
  const { login } = useAuth()
  const [username, setUsername] = useState('driver')
  const [password, setPassword] = useState('driver')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!login(username, password)) {
      setError('Thông tin đăng nhập không hợp lệ. Vui lòng thử lại.')
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--theme-brand-gradient)' }}
    >
      {/* Decorative overlay */}
      <div className="absolute inset-0 opacity-10"
        style={{ background: 'radial-gradient(circle at 30% 20%, var(--theme-brand-secondary), transparent 50%), radial-gradient(circle at 70% 80%, var(--theme-brand-primary-light), transparent 50%)' }}
      />

      <div className="relative z-10 w-full max-w-[440px] flex flex-col items-center px-4 py-8">

        {/* Brand */}
        <div className="mb-8 flex items-center gap-3">
          <div
            className="h-12 w-12 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)' }}
          >
            <Truck className="h-7 w-7" style={{ color: 'var(--theme-brand-secondary)' }} />
          </div>
          <div>
            <h1 className="font-extrabold text-3xl tracking-tight" style={{ color: 'var(--theme-text-inverse)' }}>
              TTransport
            </h1>
          </div>
        </div>

        {/* Login Card */}
        <div
          className="rounded-2xl p-8 w-full"
          style={{
            background: 'var(--theme-bg-secondary)',
            boxShadow: 'var(--theme-shadow-elevated)',
          }}
        >
          {/* Card Header */}
          <div className="mb-8">
            <h2 className="font-bold text-2xl mb-2" style={{ color: 'var(--theme-text-primary)' }}>
              Chào mừng trở lại
            </h2>
            <p className="text-base" style={{ color: 'var(--theme-text-muted)' }}>
              Đăng nhập để quản lý vận tải
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              className="flex items-center gap-2 rounded-xl px-4 py-3 mb-5 text-sm font-medium"
              style={{ background: 'var(--theme-status-error-light)', color: 'var(--theme-status-error-text)' }}
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Username */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                Tên đăng nhập
              </Label>
              <div className="relative group">
                <User
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none z-10 transition-colors"
                  style={{ color: 'var(--theme-text-muted)' }}
                />
                <Input
                  type="text"
                  placeholder="Nhập tên đăng nhập"
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError('') }}
                  className="text-sm"
                  style={{ paddingLeft: '2.25rem' }}
                  autoComplete="username"
                  autoCapitalize="none"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                Mật khẩu
              </Label>
              <div className="relative group">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none z-10 transition-colors"
                  style={{ color: 'var(--theme-text-muted)' }}
                />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  className="text-sm"
                  style={{ paddingLeft: '2.25rem', paddingRight: '2.75rem' }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-lg transition-colors"
                  style={{ color: 'var(--theme-text-muted)' }}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-12 font-bold text-base rounded-xl mt-6"
              style={{
                background: 'var(--theme-brand-secondary)',
                color: 'var(--theme-brand-primary)',
              }}
            >
              Đăng nhập
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--theme-border-light)' }}>
            <p className="text-xs text-center" style={{ color: 'var(--theme-text-muted)' }}>
              Quản lý vận tải hàng hóa với{' '}
              <span className="font-semibold" style={{ color: 'var(--theme-brand-primary)' }}>TTransport</span>
            </p>
          </div>
        </div>
      </div>

      {/* Bottom footer */}
      <div className="absolute bottom-6 left-0 right-0 z-10">
        <p className="text-center text-xs font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>
          © {new Date().getFullYear()} TTransport. Logistics Solutions.
        </p>
      </div>
    </div>
  )
}
