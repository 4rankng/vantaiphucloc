import { useState, useEffect, useRef } from 'react'

export function useActiveField<F extends string>(
  initial: F,
  focusMap?: Record<string, React.RefObject<HTMLInputElement | null>>,
) {
  const [activeField, setActiveField] = useState<F>(initial)
  const focusMapRef = useRef(focusMap)

  useEffect(() => {
    focusMapRef.current = focusMap
    focusMapRef.current?.[activeField]?.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeField])

  return { activeField, setActiveField }
}
