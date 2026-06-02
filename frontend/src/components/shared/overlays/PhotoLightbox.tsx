import { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, Download } from 'lucide-react'

interface PhotoLightboxProps {
  src: string
  alt?: string
  onClose: () => void
}

export function PhotoLightbox({ src, alt = 'Ảnh container', onClose }: PhotoLightboxProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() },
    [onClose]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleDownload = async () => {
    try {
      const res = await fetch(src)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = alt
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      window.open(src, '_blank')
    }
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Xem ảnh toàn màn hình"
      className="fixed inset-0 z-[200] flex items-center justify-center animate-in fade-in duration-200"
      style={{ background: 'rgba(0,0,0,0.92)' }}
      onClick={onClose}
    >
      {/* Top toolbar */}
      <div
        className="absolute top-0 inset-x-0 flex items-center justify-end gap-1 px-3 py-3"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium transition-colors duration-150"
          style={{ color: 'rgba(255,255,255,0.75)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#fff'
            e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.75)'
            e.currentTarget.style.background = 'transparent'
          }}
          aria-label="Tải về"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Tải về</span>
        </button>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-150"
          style={{ color: 'rgba(255,255,255,0.65)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#fff'
            e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.65)'
            e.currentTarget.style.background = 'transparent'
          }}
          aria-label="Đóng"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Image */}
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-[92vw] object-contain select-none rounded-sm animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      />
    </div>,
    document.body
  )
}
