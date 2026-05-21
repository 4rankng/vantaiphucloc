import { useState, useEffect, useCallback, useRef } from 'react'

export function useInlineEditForm<T extends Record<string, unknown>>({
  initial,
  validate,
  onSave,
  onCancel,
  focusRef,
  globalKeyboard = true,
}: {
  initial: T
  validate?: (form: T) => Record<string, string>
  onSave: (data: T) => void
  onCancel: () => void
  focusRef?: React.RefObject<HTMLInputElement | null>
  globalKeyboard?: boolean
}) {
  const [form, setForm] = useState<T>(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const initialRef = useRef(initial)
  initialRef.current = initial

  const validateRef = useRef(validate)
  validateRef.current = validate

  const isDirty = (key: keyof T) => form[key] !== initialRef.current[key]
  const anyDirty = (Object.keys(form) as (keyof T)[]).some(k => isDirty(k))

  const set = <K extends keyof T>(key: K, val: T[K]) => {
    setForm(prev => ({ ...prev, [key]: val }))
    setErrors(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  const handleSave = useCallback(() => {
    if (validateRef.current) {
      const errs = validateRef.current(form)
      if (Object.keys(errs).length > 0) { setErrors(errs); return }
    }
    onSave(form)
  }, [form, onSave])

  useEffect(() => {
    focusRef?.current?.focus()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Global keyboard handler
  useEffect(() => {
    if (!globalKeyboard) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter') { e.preventDefault(); handleSave() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel, handleSave, globalKeyboard])

  // Input-level keyboard handler (for drawers)
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onCancel() }
    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handleSave() }
  }, [onCancel, handleSave])

  const inputProps = globalKeyboard ? {} : { onKeyDown: handleInputKeyDown }

  return { form, errors, set, isDirty, anyDirty, handleSave, inputProps }
}
