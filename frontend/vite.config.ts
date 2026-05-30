import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.BACKEND_URL || 'http://localhost:8100'
  return {
  plugins: [
    react(),
    tailwindcss(),
    // Remove crossorigin from CSS links — Vite adds it but nginx has no CORS headers,
    // so the browser blocks same-origin stylesheets as CSP violations.
    {
      name: 'remove-css-crossorigin',
      transformIndexHtml: {
        order: 'post',
        handler(html: string) {
          return html.replace(/(<link\s+rel="stylesheet")\s+crossorigin/g, '$1')
        },
      },
    },
  ],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@ui': path.resolve(__dirname, './src/components/ui'),
      '@shared': path.resolve(__dirname, './src/components/shared'),
      '@layout': path.resolve(__dirname, './src/components/layout'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@data': path.resolve(__dirname, './src/data'),
      '@themes': path.resolve(__dirname, './src/themes'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
        timeout: 0,
      },
      '/photos': {
        target: backendUrl,
        changeOrigin: true,
      },
    },
  },
  }
})
