import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
        <Toaster richColors position="top-right" />
      </BrowserRouter>
      <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
        <h1>🚛 Vận tải hàng hóa</h1>
        <p>Frontend scaffold ready. Start building!</p>
      </div>
    </QueryClientProvider>
  )
}

export default App
