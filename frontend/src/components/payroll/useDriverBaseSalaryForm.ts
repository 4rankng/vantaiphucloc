/**
 * Form state for editing a driver's base salary (DriverBaseSalaryDialog).
 *
 * Keeps the UI .tsx free of validation + mutation wiring per the file-
 * responsibility rule. The dialog component imports this hook and renders
 * the returned bindings.
 */

import { useCallback, useMemo, useState } from 'react'
import { useToast } from '@/components/atoms/Toast'
import {
  useDriverBaseSalaryHistory,
  useSetDriverBaseSalary,
} from '@/hooks/use-queries'

export interface UseDriverBaseSalaryFormArgs {
  driverId: number | null | undefined
  onSaved?: () => void
}

function todayIso(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function parseCurrency(raw: string): number | null {
  const digits = raw.replace(/[^0-9]/g, '')
  if (!digits) return null
  return Number(digits)
}

export function useDriverBaseSalaryForm(args: UseDriverBaseSalaryFormArgs) {
  const toast = useToast()
  const { data: history = [], isLoading } = useDriverBaseSalaryHistory(args.driverId)
  const setMutation = useSetDriverBaseSalary()

  const [baseSalary, setBaseSalaryRaw] = useState('')
  const [effectiveFrom, setEffectiveFrom] = useState(todayIso())
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const currentRate = useMemo(() => history[0] ?? null, [history])

  const setBaseSalary = useCallback((value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '')
    const display = cleaned ? Number(cleaned).toLocaleString('vi-VN') : ''
    setBaseSalaryRaw(display)
    setError(null)
  }, [])

  const reset = useCallback(() => {
    setBaseSalaryRaw('')
    setEffectiveFrom(todayIso())
    setNote('')
    setError(null)
  }, [])

  const submit = useCallback(async () => {
    if (!args.driverId) return
    const parsed = parseCurrency(baseSalary)
    if (parsed == null) {
      setError('Vui lòng nhập mức lương')
      return
    }
    if (parsed < 0) {
      setError('Lương phải lớn hơn hoặc bằng 0')
      return
    }
    if (!effectiveFrom) {
      setError('Vui lòng chọn ngày hiệu lực')
      return
    }
    try {
      await setMutation.mutateAsync({
        driverId: args.driverId,
        baseSalary: parsed,
        effectiveFrom,
        note: note.trim() || null,
      })
      toast.success('Đã lưu mức lương cơ bản')
      reset()
      args.onSaved?.()
    } catch (e) {
      toast.error('Lỗi', e instanceof Error ? e.message : 'Không thể lưu')
    }
  }, [args, baseSalary, effectiveFrom, note, reset, setMutation, toast])

  return {
    history,
    historyLoading: isLoading,
    currentRate,
    fields: {
      baseSalary,
      effectiveFrom,
      note,
    },
    setBaseSalary,
    setEffectiveFrom,
    setNote,
    error,
    submitting: setMutation.isPending,
    submit,
    reset,
  }
}
