import { X } from 'lucide-react'

interface PhotoLightboxProps {
  url: string | null
  onClose: () => void
}

export function PhotoLightbox({ url, onClose }: PhotoLightboxProps) {
  if (!url) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.92)' }}
      onClick={onClose}
    >
      <img
        src={url}
        alt="Ảnh container"
        className="max-w-full max-h-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        onClick={onClose}
        className="absolute top-4 right-4 flex min-h-[52px] items-center gap-2 rounded-xl px-5 text-base font-bold touch-manipulation"
        style={{ background: 'rgba(255,255,255,0.15)', color: 'var(--theme-text-on-brand)', backdropFilter: 'blur(8px)' }}
      >
        <X className="h-6 w-6" />
        Đóng
      </button>
    </div>
  )
}
