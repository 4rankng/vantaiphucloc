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
      {/* Decorative circles */}
      <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full" style={{ background: 'var(--theme-brand-primary)', opacity: 0.12 }} />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full" style={{ background: 'var(--theme-brand-primary)', opacity: 0.08 }} />

      <div className="relative z-10 w-full max-w-[440px] flex flex-col items-center px-5 py-8">

        {/* Brand */}
        <div className="mb-10 flex flex-col items-center">
          <div
            className="h-16 w-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-elevated)' }}
          >
            <Truck className="h-8 w-8" style={{ color: 'var(--theme-brand-primary)' }} />
          </div>
          <h1 className="font-extrabold text-3xl tracking-tight" style={{ color: 'var(--theme-text-inverse)' }}>
            TTransport
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--theme-text-inverse)', opacity: 0.7 }}>
            Quản lý vận tải hàng hóa
          </p>
        </div>

        {/* Login Card */}
        <div
          className="rounded-3xl p-7 w-full"
          style={{
            background: 'var(--theme-bg-secondary)',
            boxShadow: 'var(--theme-shadow-elevated)',
          }}
        >
          {/* Card Header */}
          <div className="mb-7">
            <h2 className="font-bold text-xl" style={{ color: 'var(--theme-text-primary)' }}>
              Đăng nhập
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--theme-text-secondary)' }}>
              Nhập thông tin để tiếp tục
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              className="flex items-center gap-2.5 rounded-2xl px-4 py-3.5 mb-5 text-sm font-medium"
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
              <div className="relative">
                <User
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 pointer-events-none z-10"
                  style={{ color: 'var(--theme-text-muted)' }}
                />
                <Input
                  type="text"
                  placeholder="Nhập tên đăng nhập"
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError('') }}
                  className="text-sm search-pill"
                  style={{ paddingLeft: '2.75rem' }}
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
              <div className="relative">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 pointer-events-none z-10"
                  style={{ color: 'var(--theme-text-muted)' }}
                />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  className="text-sm search-pill"
                  style={{ paddingLeft: '2.75rem', paddingRight: '3rem' }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center"
                  style={{ color: 'var(--theme-text-muted)' }}
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-12 font-bold text-base rounded-2xl mt-2"
            >
              Đăng nhập
            </Button>
          </form>
        </div>

        {/* Bottom */}
        <p className="mt-8 text-xs" style={{ color: 'var(--theme-text-inverse)', opacity: 0.5 }}>
          © {new Date().getFullYear()} TTransport
        </p>
      </div>
    </div>
  )
}
