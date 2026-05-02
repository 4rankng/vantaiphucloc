import { useState, useCallback } from 'react'
import { api } from '@/services/api/client'

interface ContainerValidation {
  validating: boolean
  error: string | null
  validate: (containerNumber: string) => Promise<{ valid: boolean; normalized?: string; error?: string }>
}

export function useContainerValidation(): ContainerValidation {
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validate = useCallback(async (containerNumber: string) => {
    if (!containerNumber.trim()) {
      setError(null)
      return { valid: true }
    }

    setValidating(true)
    setError(null)
    try {
      const res = await api.get('/work-orders/validate-container', {
        params: { container_number: containerNumber },
      })
      const { valid, error: errMsg, normalized } = res.data
      if (!valid) {
        setError(errMsg ?? 'Số container không hợp lệ')
      }
      return { valid, normalized, error: errMsg }
    } catch {
      setError('Không thể kiểm tra số container')
      return { valid: false, error: 'Không thể kiểm tra số container' }
    } finally {
      setValidating(false)
    }
  }, [])

  return { validating, error, validate }
}
