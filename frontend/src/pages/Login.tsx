import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import { Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react'

export function Login() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const success = await login(username, password)
    setLoading(false)
    if (!success) {
      setError('Thông tin đăng nhập không hợp lệ. Vui lòng thử lại.')
    }
  }

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--theme-brand-gradient)' }}
    >
      {/* Decorative circles */}
      <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full" style={{ background: 'var(--theme-brand-primary)', opacity: 0.12 }} />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full" style={{ background: 'var(--theme-brand-primary)', opacity: 0.08 }} />

      {/* Brand */}
      <div className="absolute top-8 left-0 right-0 flex flex-col items-center z-10">
        <img
          src="/logo.png"
          alt="TTransport"
          className="h-16 w-auto mb-3 drop-shadow-md rounded-[22%]"
        />
        <p className="text-sm mt-1" style={{ color: 'var(--theme-text-on-brand)', opacity: 0.75 }}>
          Quản lý vận tải hàng hóa
        </p>
      </div>

      {/* Login Card */}
      <div
        className="relative z-10 w-full max-w-[400px] rounded-3xl p-7 mx-5 mt-32"
        style={{
          background: 'var(--theme-bg-secondary)',
          boxShadow: 'var(--theme-shadow-elevated)',
        }}
      >
        <div className="mb-6">
          <h2 className="font-bold text-xl" style={{ color: 'var(--theme-text-primary)' }}>
            Đăng nhập
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--theme-text-secondary)' }}>
            Nhập thông tin để tiếp tục
          </p>
        </div>

        {error && (
          <div
            className="flex items-center gap-2.5 rounded-xl px-4 py-3 mb-5 text-sm font-medium"
            style={{ background: 'var(--theme-status-error-light)', color: 'var(--theme-status-error-text)' }}
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Username / Phone / Email */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              Số điện thoại / Email / Tên đăng nhập
            </label>
            <div className="relative">
              <User
                className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none z-10"
                style={{ color: 'var(--theme-text-muted)' }}
              />
              <Input
                type="text"
                placeholder="SĐT, email hoặc tên đăng nhập"
                value={username}
                onChange={e => { setUsername(e.target.value); setError('') }}
                className="login-input"
                autoComplete="username"
                autoCapitalize="none"
                disabled={loading}
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              Mật khẩu
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none z-10"
                style={{ color: 'var(--theme-text-muted)' }}
              />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                className="login-input"
                style={{ paddingRight: '3rem' }}
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-full"
                style={{ color: 'var(--theme-text-muted)' }}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full h-12 font-semibold text-base rounded-xl mt-2"
            style={{
              background: 'var(--theme-brand-primary)',
              color: 'var(--theme-text-on-brand)',
            }}
            disabled={loading}
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </Button>
        </form>
      </div>
    </div>
  )
}
