import axios from 'axios'
import type { AxiosInstance } from 'axios'
import type { ApiError } from '@/lib/error-utils'

const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1'

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (error) => {
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
      apiError.statusCode = status
      switch (status) {
        case 401: apiError.type = 'auth'; apiError.message = 'Phiên đăng nhập hết hạn'; break
        case 403: apiError.type = 'auth'; apiError.message = 'Bạn không có quyền thực hiện'; break
        case 404: apiError.type = 'not-found'; apiError.message = 'Không tìm thấy'; break
        case 422: apiError.type = 'validation'; apiError.message = 'Dữ liệu không hợp lệ'; break
        default: apiError.type = 'server'; apiError.message = 'Lỗi máy chủ, vui lòng thử lại sau'
      }
    }
    return Promise.reject(apiError)
  }
)

export default api
