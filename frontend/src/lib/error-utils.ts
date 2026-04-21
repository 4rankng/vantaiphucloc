export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public component?: string,
    public context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export interface ApiError {
  type: 'network' | 'validation' | 'server' | 'auth' | 'not-found'
  message: string
  field?: string
  statusCode?: number
  endpoint?: string
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

const ERROR_MESSAGES: Record<string, string> = {
  NETWORK_ERROR: 'Không thể kết nối đến máy chủ',
  TIMEOUT_ERROR: 'Yêu cầu quá thời gian, vui lòng thử lại',
  VALIDATION_ERROR: 'Dữ liệu không hợp lệ',
  UNAUTHORIZED: 'Bạn cần đăng nhập để tiếp tục',
  FORBIDDEN: 'Bạn không có quyền thực hiện hành động này',
  NOT_FOUND: 'Không tìm thấy tài nguyên',
  SERVER_ERROR: 'Đã xảy ra lỗi máy chủ, vui lòng thử lại sau',
}

export function getErrorMessage(error: unknown): string {
  if (isAppError(error)) return ERROR_MESSAGES[error.code] || error.message
  if (error instanceof Error) return error.message
  return 'Đã xảy ra lỗi không xác định'
}

export function getErrorContext(error: unknown): string | null {
  return isAppError(error) ? error.component || null : null
}

export function normalizeApiError(error: unknown, endpoint?: string): ApiError {
  if (isAppError(error)) {
    return { type: 'server', message: error.message, statusCode: error.statusCode, endpoint }
  }
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return { type: 'network', message: ERROR_MESSAGES.NETWORK_ERROR, endpoint }
  }
  return { type: 'server', message: ERROR_MESSAGES.SERVER_ERROR, endpoint }
}
