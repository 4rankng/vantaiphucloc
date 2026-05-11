import axios from 'axios'
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'
import type { ApiError } from '@/lib/error-utils'

const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1'

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Token accessors ──────────────────────────────────────────────────

export function getAccessToken(): string | null {
  return localStorage.getItem('access_token')
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('refresh_token')
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem('access_token', accessToken)
  localStorage.setItem('refresh_token', refreshToken)
}

export function clearTokens(): void {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('ttransport_user')
}

// ── Request interceptor: inject access token ─────────────────────────

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response interceptor: silent refresh on 401 ──────────────────────

let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (token) resolve(token)
    else reject(error)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig | undefined

    if (error.response?.status === 401 && originalRequest) {
      // Don't intercept 401s on auth endpoints — they're expected (wrong credentials)
      const url = originalRequest.url ?? ''
      if (url.startsWith('/auth/login') || url.startsWith('/auth/refresh')) {
        return Promise.reject(error)
      }

      const refreshToken = getRefreshToken()

      if (!refreshToken) {
        clearTokens()
        localStorage.setItem('ttransport_redirect', window.location.pathname + window.location.search)
        window.location.href = '/'
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`
              resolve(api(originalRequest))
            },
            reject,
          })
        })
      }

      isRefreshing = true

      try {
        const res = await axios.post(`${API_BASE}/auth/refresh`, {
          refresh_token: refreshToken,
        })
        const { access_token, refresh_token: newRefresh } = res.data
        setTokens(access_token, newRefresh)

        originalRequest.headers.Authorization = `Bearer ${access_token}`
        processQueue(null, access_token)

        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        clearTokens()
        localStorage.setItem('ttransport_redirect', window.location.pathname + window.location.search)
        window.location.href = '/'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    // Non-401 error handling
    const apiError: ApiError = {
      type: 'network',
      message: 'Đã xảy ra lỗi, vui lòng thử lại',
      endpoint: error.config?.url,
    }

    if (error.code === 'ECONNABORTED' || !error.response) {
      apiError.type = 'network'
      apiError.message = error.code === 'ECONNABORTED'
        ? 'Yêu cầu quá thời gian, vui lòng thử lại'
        : 'Không thể kết nối đến máy chủ'
    } else {
      const status = error.response?.status
      const rawData = error.response?.data as { detail?: string | { msg: string }[]; error?: string } | undefined
      const detail = rawData?.detail
      const backendMsg = (Array.isArray(detail) ? detail.map(d => d.msg).join('; ') : detail)
        || rawData?.error
      apiError.statusCode = status
      switch (status) {
        case 400: apiError.type = 'validation'; apiError.message = backendMsg || 'Dữ liệu không hợp lệ'; break
        case 403: apiError.type = 'auth'; apiError.message = backendMsg || 'Bạn không có quyền thực hiện'; break
        case 404: apiError.type = 'not-found'; apiError.message = backendMsg || 'Không tìm thấy'; break
        case 422: apiError.type = 'validation'; apiError.message = backendMsg || 'Dữ liệu không hợp lệ'; break
        case 429: apiError.type = 'network'; apiError.message = 'Quá nhiều yêu cầu, vui lòng thử lại sau'; break
        default: apiError.type = 'server'; apiError.message = backendMsg || 'Lỗi máy chủ, vui lòng thử lại sau'
      }
    }
    return Promise.reject(apiError)
  }
)

export default api
