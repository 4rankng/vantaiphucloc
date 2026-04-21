import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Truck } from 'lucide-react'

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
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: 'var(--theme-bg-primary)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto mb-2 w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
            <Truck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--theme-text-primary)' }}>TTransport</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--theme-text-muted)' }}>Đăng nhập tài xế</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--theme-text-muted)' }}>Tên đăng nhập</label>
            <Input placeholder="Tài khoản" value={username} onChange={e => { setUsername(e.target.value); setError('') }} className="h-11" />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--theme-text-muted)' }}>Mật khẩu</label>
            <Input type="password" placeholder="••••••" value={password} onChange={e => { setPassword(e.target.value); setError('') }} className="h-11" />
          </div>
          {error && <p className="text-sm" style={{ color: 'var(--theme-status-error)' }}>{error}</p>}
          <Button type="submit" className="w-full h-11 text-base font-semibold rounded-xl">Đăng nhập</Button>
        </form>
      </div>
    </div>
  )
}
