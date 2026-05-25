import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui'
import { AlertTriangle } from 'lucide-react'

export function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center min-h-[80dvh] p-8 text-center">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{ background: 'var(--theme-bg-tertiary)' }}>
        <AlertTriangle className="w-8 h-8" style={{ color: 'var(--theme-text-muted)' }} />
      </div>
      <h1 className="typo-h1 mb-2" style={{ color: 'var(--theme-text-primary)' }}>404</h1>
      <p className="typo-body-sm mb-6" style={{ color: 'var(--theme-text-muted)' }}>
        Không tìm thấy trang này
      </p>
      <Button size="sm" onClick={() => navigate('/')}>Quay lại Tổng quan</Button>
    </div>
  )
}
