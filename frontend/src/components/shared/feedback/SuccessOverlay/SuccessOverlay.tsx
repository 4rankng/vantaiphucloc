import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

interface SuccessOverlayProps {
  visible: boolean
  message?: string
  onDone?: () => void
}

export function SuccessOverlay({ visible, message = 'Đã gửi chuyến', onDone }: SuccessOverlayProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
     
    if (!visible) { setShow(false); return }
    setShow(true)
    const timer = setTimeout(() => {
      setShow(false)
      onDone?.()
    }, 2000)
     
    return () => clearTimeout(timer)
  }, [visible, onDone])

  if (!show) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4"
      style={{ background: 'var(--theme-brand-gradient)' }}
    >
      <div className="animate-[scaleIn_0.3s_ease-out] flex flex-col items-center gap-4">
        <CheckCircle2 className="w-16 h-16" style={{ color: 'var(--theme-text-on-brand)' }} strokeWidth={1.5} />
        <p className="typo-h1" style={{ color: 'var(--theme-text-on-brand)' }}>
          {message}
        </p>
      </div>

      <style>{`
        @keyframes scaleIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
