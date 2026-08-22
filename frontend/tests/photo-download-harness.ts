import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { PhotoLightbox } from '@/components/shared/overlays/PhotoLightbox'

createRoot(document.getElementById('root')!).render(
  createElement(PhotoLightbox, {
    src: '/photos/2026/08/22/container.jpg',
    alt: 'Ảnh container',
    onClose: () => undefined,
  }),
)
