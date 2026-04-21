import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function Login() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!login(username, password)) {
      setError('Sai tên đăng nhập hoặc mật khẩu')
    }
  }

  return (
    <div className="min-h-screen bg-[var(--theme-bg-primary)] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🚛</div>
          <h1 className="text-2xl font-bold text-[var(--theme-text-primary)]">TTransport</h1>
          <p className="text-sm text-[var(--theme-text-muted)] mt-1">Đăng nhập tài xế</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[var(--theme-text-secondary)] mb-1 block">Tên đăng nhập</label>
            <Input placeholder="Tài khoản" value={username} onChange={e => { setUsername(e.target.value); setError('') }} />
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--theme-text-secondary)] mb-1 block">Mật khẩu</label>
            <Input type="password" placeholder="••••••" value={password} onChange={e => { setPassword(e.target.value); setError('') }} />
          </div>
          {error && <p className="text-sm" style={{ color: 'var(--theme-status-error)' }}>{error}</p>}
          <Button type="submit" className="w-full h-12 text-base font-semibold rounded-xl">Đăng nhập</Button>
        </form>
      </div>
    </div>
  )
}
