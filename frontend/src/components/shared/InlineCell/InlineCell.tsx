import { useRef, useEffect } from 'react'
import { Input } from '@/components/ui'

interface InlineCellProps {
  value: number | string
  onChange: (value: number) => void
  type?: 'number' | 'text'
  editing: boolean
  display?: string
  className?: string
  inputClassName?: string
}

export function InlineCell({
  value,
  onChange,
  type = 'number',
  editing,
  display,
  className = '',
  inputClassName = '',
}: InlineCellProps) {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && ref.current) ref.current.select()
  }, [editing])

  if (!editing) {
    return (
      <span className={`tabular-nums ${className}`}>
        {display ?? value}
      </span>
    )
  }

  return (
    <Input
      ref={ref}
      type={type}
      min={0}
      value={value || ''}
      onChange={e => onChange(Math.max(0, Number(e.target.value)))}
      placeholder="0"
      className={`text-xs font-mono h-7 px-1.5 ${inputClassName}`}
      onKeyDown={e => e.stopPropagation()}
    />
  )
}
