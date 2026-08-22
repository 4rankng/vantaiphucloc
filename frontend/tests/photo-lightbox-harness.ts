import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { PhotoLightbox } from '@/components/shared/overlays/PhotoLightbox'
import { applyThemeToDOM } from '@/themes/css'
import { nepoTheme } from '@/themes/nepo'
import '@/index.css'

const params = new URLSearchParams(window.location.search)
const src = params.get('src') || '/test-image'
applyThemeToDOM(nepoTheme)

createRoot(document.getElementById('root')!).render(
  createElement(PhotoLightbox, {
    src,
    alt: 'Ảnh container FSCU 7824519',
    onClose: () => {
      document.body.dataset.viewerClosed = 'true'
    },
  }),
)
